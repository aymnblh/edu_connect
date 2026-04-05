/// Backend endpoint to store FCM tokens and send push notifications.
/// Append this to edu_connect_backend/app/routers/users.py
///
/// In users.py add:
///
///   from pydantic import BaseModel
///
///   class FcmTokenRequest(BaseModel):
///       token: str
///
///   @router.patch("/me/fcm-token")
///   async def register_fcm_token(
///       payload: FcmTokenRequest,
///       current_user: User = Depends(get_current_user),
///       db: AsyncSession = Depends(get_db),
///   ):
///       current_user.fcm_token = payload.token
///       await db.commit()
///       return {"status": "ok"}
///
/// And add fcm_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
/// to the User model in models.py.
///
/// To send a notification from the backend (e.g. on new message):
///
///   from firebase_admin import messaging
///
///   def send_push(token: str, title: str, body: str):
///       msg = messaging.Message(
///           notification=messaging.Notification(title=title, body=body),
///           token=token,
///       )
///       messaging.send(msg)
