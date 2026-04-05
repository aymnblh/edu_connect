from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import csv
import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from ..database import get_db
from ..models import Grade, User, UserRole, Class, Student, StudentParent, School
from ..schemas import GradeCreate, GradeOut
from ..auth import get_current_user
from app.utils.notifications import create_notification

router = APIRouter(prefix="/classes/{class_id}/grades", tags=["Grades"])


@router.post("/", response_model=GradeOut, status_code=201)
async def add_grade(
    class_id: str,
    payload: GradeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if teacher is assigned to this class (or is admin)
    if current_user.role.value not in ["principal", "secretary", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role.value == "teacher":
        stmt = select(Class).join(Class.teachers).where(Class.id == class_id, User.id == current_user.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="You are not a teacher for this class")

    grade = Grade(**payload.model_dump(), class_id=class_id)
    db.add(grade)
    
    # Create In-App Notification
    # Notify Parents (since students have no accounts)
    parents_res = await db.execute(select(User).join(User.students_linking).where(Student.id == payload.student_id))
    parents = parents_res.scalars().all()
    for parent in parents:
        await create_notification(
            db,
            user_id=parent.id,
            title="Nouvelle Note",
            content=f"Votre enfant a reçu une note de {payload.score}/{payload.max_score} en {payload.subject}.",
            type="SUCCESS"
        )
    
    await db.commit()
    await db.refresh(grade)
    return grade


@router.get("/", response_model=list[GradeOut])
async def list_grades(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Grade).where(Grade.class_id == class_id)
    elif current_user.role.value == "teacher":
        # Check if they teach this class
        stmt = select(Grade).join(Class).join(Class.teachers).where(Class.id == class_id, User.id == current_user.id)
    else:
        # Parent: Only see grades for their children
        stmt = (
            select(Grade)
            .join(Student)
            .join(Student.parents)
            .where(Grade.class_id == class_id, User.id == current_user.id)
        )
    
    result = await db.execute(stmt.order_by(Grade.date.desc()))
    return result.scalars().all()


@router.get("/student/{student_id}", response_model=list[GradeOut])
async def student_grades(
    class_id: str, student_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value in ["principal", "secretary"]:
        stmt = select(Grade).where(Grade.class_id == class_id, Grade.student_id == student_id)
    elif current_user.role.value == "teacher":
        # Check if they teach this class
        stmt = select(Grade).join(Class).join(Class.teachers).where(
            Grade.class_id == class_id, 
            Grade.student_id == student_id,
            User.id == current_user.id
        )
    else:
        # Parent: Only if this is their child
        stmt = select(Grade).join(Student).join(Student.parents).where(
            Grade.class_id == class_id,
            Grade.student_id == student_id,
            User.id == current_user.id
        )

    result = await db.execute(stmt.order_by(Grade.date.desc()))
    return result.scalars().all()


@router.get("/export")
async def export_grades(
    class_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role.value not in ["principal", "secretary", "teacher"]:
        raise HTTPException(status_code=403, detail="Unprivileged")
        
    # Verify access to class
    if current_user.role.value == "teacher":
        stmt = select(Class).join(Class.teachers).where(Class.id == class_id, User.id == current_user.id)
        res = await db.execute(stmt)
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="You are not a teacher for this class")

    # Fetch Class and School to get prefix
    class_res = await db.execute(select(Class).where(Class.id == class_id))
    cls = class_res.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
        
    school_res = await db.execute(select(School).where(School.id == cls.school_id))
    school = school_res.scalar_one_or_none()
    prefix = school.student_id_prefix if school and school.student_id_prefix else ""

    # Fetch all grades for this class
    grades_res = await db.execute(select(Grade).where(Grade.class_id == class_id))
    grades = grades_res.scalars().all()

    # Calculate Ranking (Rang) based on student averages
    student_averages = {}
    for g in grades:
        if g.student_id not in student_averages:
            student_averages[g.student_id] = []
        student_averages[g.student_id].append(g.score)
    
    # Calculate means and sort
    averages_list = [
        (sid, sum(scores)/len(scores)) 
        for sid, scores in student_averages.items()
    ]
    averages_list.sort(key=lambda x: x[1], reverse=True)
    
    # Map student_id to rank
    rank_map = {sid: i + 1 for i, (sid, _) in enumerate(averages_list)}

    # CSV headers in Algerian bulletin style
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["ID_Eleve", "Nom", "Prenom", "Matiere", "Note", "Note_Max", "Date", "Rang", "Observation"])

    for g in grades:
        # Strip prefix if it exists
        clean_id = g.student_id
        if prefix and clean_id.startswith(prefix):
            clean_id = clean_id[len(prefix):]
            
        # Split name for Nom/Prenom
        name_parts = g.student_name.split(' ', 1)
        prenom = name_parts[0]
        nom = name_parts[1] if len(name_parts) > 1 else ""
            
        writer.writerow([
            clean_id,
            nom,
            prenom,
            g.subject,
            g.score,
            g.max_score,
            g.date.strftime("%Y-%m-%d"),
            rank_map.get(g.student_id, "-"),
            g.comment or ""
        ])

    output.seek(0)
    # Using utf-8-sig to include BOM for Excel compatibility (French/Algerian settings)
    return StreamingResponse(
        iter([output.getvalue().encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bulletin_{class_id}.csv"}
    )
