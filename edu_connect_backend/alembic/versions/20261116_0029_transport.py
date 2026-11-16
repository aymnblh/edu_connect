"""school transport routes, stops, assignments, trips, events and exceptions

Revision ID: 20261116_0029
Revises: 20261116_0028
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20261116_0029"
down_revision: Union[str, None] = "20261116_0028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TRANSPORT_TABLES = (
    "transport_exceptions",
    "transport_trip_events",
    "transport_trips",
    "transport_assignments",
    "transport_stops",
    "transport_routes",
)


def _enable_rls(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
    op.execute(
        f"""
        CREATE POLICY tenant_isolation_{table} ON {table}
        USING (school_id = current_setting('app.current_school_id', true))
        WITH CHECK (school_id = current_setting('app.current_school_id', true))
        """
    )


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS transport_routes (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            name VARCHAR(120) NOT NULL,
            vehicle_plate VARCHAR(40),
            capacity INTEGER NOT NULL DEFAULT 30,
            driver_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            assistant_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            monthly_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
            active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_routes_school_id ON transport_routes (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_routes_driver_id ON transport_routes (driver_id)")
    _enable_rls("transport_routes")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS transport_stops (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            route_id VARCHAR(36) NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
            name VARCHAR(160) NOT NULL,
            position INTEGER NOT NULL DEFAULT 1,
            morning_time VARCHAR(5),
            evening_time VARCHAR(5)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_stops_school_id ON transport_stops (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_stops_route_id ON transport_stops (route_id)")
    _enable_rls("transport_stops")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS transport_assignments (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            route_id VARCHAR(36) NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
            stop_id VARCHAR(36) NOT NULL REFERENCES transport_stops(id) ON DELETE CASCADE,
            direction VARCHAR(10) NOT NULL DEFAULT 'both',
            start_date DATE NOT NULL,
            end_date DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT uq_transport_assignments_student UNIQUE (school_id, student_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_assignments_school_id ON transport_assignments (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_assignments_student_id ON transport_assignments (student_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_assignments_route_id ON transport_assignments (route_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_assignments_stop_id ON transport_assignments (stop_id)")
    _enable_rls("transport_assignments")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS transport_trips (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            route_id VARCHAR(36) NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
            day DATE NOT NULL,
            direction VARCHAR(10) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
            started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            completed_at TIMESTAMP WITH TIME ZONE,
            delay_minutes INTEGER NOT NULL DEFAULT 0,
            driver_id VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            CONSTRAINT uq_transport_trips_route_day_dir UNIQUE (school_id, route_id, day, direction)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_trips_school_id ON transport_trips (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_trips_route_id ON transport_trips (route_id)")
    _enable_rls("transport_trips")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS transport_trip_events (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            trip_id VARCHAR(36) NOT NULL REFERENCES transport_trips(id) ON DELETE CASCADE,
            student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            kind VARCHAR(15) NOT NULL,
            recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            recorded_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            client_event_id VARCHAR(64) NOT NULL,
            CONSTRAINT uq_transport_trip_events_client UNIQUE (trip_id, client_event_id)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_trip_events_school_id ON transport_trip_events (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_trip_events_trip_id ON transport_trip_events (trip_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_trip_events_student_id ON transport_trip_events (student_id)")
    _enable_rls("transport_trip_events")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS transport_exceptions (
            id VARCHAR(36) PRIMARY KEY,
            school_id VARCHAR(36) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
            student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            day DATE NOT NULL,
            direction VARCHAR(10) NOT NULL DEFAULT 'evening',
            reason VARCHAR(200),
            created_by VARCHAR(128) REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            CONSTRAINT uq_transport_exceptions_student_day UNIQUE (school_id, student_id, day, direction)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_exceptions_school_id ON transport_exceptions (school_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_transport_exceptions_student_id ON transport_exceptions (student_id)")
    _enable_rls("transport_exceptions")


def downgrade() -> None:
    for table in TRANSPORT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{table} ON {table}")
        op.execute(f"DROP TABLE IF EXISTS {table}")
