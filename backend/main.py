# ============================================================
# GLOBAL DISASTER RELIEF SYSTEM
# CLEAN REAL-TIME FASTAPI BACKEND
# ============================================================

import os
import math
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
)

from fastapi.middleware.cors import CORSMiddleware

from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
)

from pydantic import (
    BaseModel,
    EmailStr,
    ConfigDict,
)

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    func,
)

from sqlalchemy.exc import IntegrityError

from sqlalchemy.orm import (
    sessionmaker,
    Session,
    declarative_base,
)


# ============================================================
# CONFIG
# ============================================================

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "change-this-secret-key-in-production",
)

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30


# ============================================================
# DATABASE
# ============================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./disaster.db",
)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql://",
        1,
    )

connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {
        "check_same_thread": False,
    }

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# ============================================================
# USER
# ============================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    username = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    hashed_password = Column(
        String,
        nullable=False,
    )


# ============================================================
# INCIDENT
# ============================================================

class Incident(Base):

    __tablename__ = "incidents"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    incident_code = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    lat = Column(
        Float,
        nullable=False,
    )

    lng = Column(
        Float,
        nullable=False,
    )

    accuracy = Column(
        Float,
        nullable=True,
    )

    type = Column(
        String,
        nullable=False,
        default="EMERGENCY_SOS",
    )

    severity = Column(
        String,
        nullable=False,
        default="HIGH",
    )

    status = Column(
        String,
        nullable=False,
        default="ACTIVE",
    )

    source = Column(
        String,
        nullable=True,
    )

    location_name = Column(
        String,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    dispatched_at = Column(
        DateTime,
        nullable=True,
    )


# ============================================================
# RESPONSE TEAM
# ============================================================

class ResponseTeam(Base):

    __tablename__ = "response_teams"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    team_code = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    name = Column(
        String,
        nullable=False,
    )

    team_type = Column(
        String,
        nullable=False,
    )

    lat = Column(
        Float,
        nullable=False,
    )

    lng = Column(
        Float,
        nullable=False,
    )

    status = Column(
        String,
        nullable=False,
        default="AVAILABLE",
    )

    incident_id = Column(
        Integer,
        nullable=True,
    )


# ============================================================
# VOLUNTEER
# ============================================================

class Volunteer(Base):

    __tablename__ = "volunteers"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    volunteer_code = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    name = Column(
        String,
        nullable=False,
    )

    lat = Column(
        Float,
        nullable=False,
    )

    lng = Column(
        Float,
        nullable=False,
    )

    status = Column(
        String,
        nullable=False,
        default="AVAILABLE",
    )

    incident_id = Column(
        Integer,
        nullable=True,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


# ============================================================
# FUNDING TARGET
#
# IMPORTANT:
# This table stores ONLY the campaign target.
# It does NOT store "raised".
# ============================================================

class Funding(Base):

    __tablename__ = "funding"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    target = Column(
        Float,
        nullable=False,
        default=0,
    )


# ============================================================
# REAL DONATION TABLE
# ============================================================

class Donation(Base):

    __tablename__ = "donations"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    amount = Column(
        Float,
        nullable=False,
    )

    purpose = Column(
        String,
        nullable=False,
        default="Emergency Relief",
    )

    currency = Column(
        String,
        nullable=False,
        default="INR",
    )

    status = Column(
        String,
        nullable=False,
        default="SUCCESS",
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )


# ============================================================
# CREATE TABLES
# ============================================================

Base.metadata.create_all(
    bind=engine,
)


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Global Disaster Relief System",
    version="3.0.0",
)


# ============================================================
# CORS
# ============================================================

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
]

app.add_middleware(
    CORSMiddleware,

    allow_origins=ALLOWED_ORIGINS,

    allow_origin_regex=r"https://.*\.vercel\.app",

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# AUTH
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login",
)


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


def get_password_hash(
    password: str,
):

    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str,
):

    try:

        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )

    except Exception:

        return False


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
):

    payload = data.copy()

    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES,
        )
    )

    payload["exp"] = expire

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):

    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
    )

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        username = payload.get("sub")

        if not username:
            raise credentials_exception

    except JWTError:

        raise credentials_exception

    user = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if not user:

        raise credentials_exception

    return user


# ============================================================
# PYDANTIC MODELS
# ============================================================

class UserCreate(BaseModel):

    username: str
    email: EmailStr
    password: str


class UserOut(BaseModel):

    id: int
    username: str
    email: EmailStr

    model_config = ConfigDict(
        from_attributes=True,
    )


class Token(BaseModel):

    access_token: str
    token_type: str


class ProfileUpdate(BaseModel):

    email: EmailStr


class AIAnalyzeRequest(BaseModel):

    text: str


class DonationRequest(BaseModel):

    amount: float
    purpose: Optional[str] = "Emergency Relief"


class SOSRequest(BaseModel):

    lat: float
    lng: float

    accuracy: Optional[float] = None

    type: str = "EMERGENCY_SOS"

    source: str = "WEB_APP"

    location_name: Optional[str] = None

    timestamp: Optional[str] = None


class DispatchRequest(BaseModel):

    lat: Optional[float] = None
    lng: Optional[float] = None

    requested_at: Optional[str] = None

    requested_units: list[str] = []


class TeamLocationUpdate(BaseModel):

    lat: float
    lng: float


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "service": "Global Disaster Relief System",
        "backend": "FastAPI",
        "version": "3.0.0",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ============================================================
# AUTH REGISTER
# ============================================================

@app.post(
    "/register",
    response_model=UserOut,
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
):

    username = user.username.strip()

    email = str(user.email).strip().lower()

    password = user.password.strip()

    if not username:

        raise HTTPException(
            status_code=400,
            detail="Username is required",
        )

    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters",
        )

    if len(password.encode("utf-8")) > 72:

        raise HTTPException(
            status_code=400,
            detail="Password must be 72 characters or less",
        )

    existing_username = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if existing_username:

        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )

    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:

        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    new_user = User(
        username=username,
        email=email,
        hashed_password=get_password_hash(password),
    )

    try:

        db.add(new_user)

        db.commit()

        db.refresh(new_user)

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Username or email already exists",
        )

    return new_user


# ============================================================
# LOGIN
# ============================================================

@app.post(
    "/login",
    response_model=Token,
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(
            User.username == form_data.username.strip()
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
        )

    if not verify_password(
        form_data.password,
        user.hashed_password,
    ):

        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
        )

    token = create_access_token(
        {
            "sub": user.username,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }


# ============================================================
# PROFILE
# ============================================================

@app.get(
    "/profile",
    response_model=UserOut,
)
def profile(
    current_user: User = Depends(
        get_current_user
    ),
):

    return current_user


# ============================================================
# STATS
# ============================================================

@app.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
):

    active_alerts = (
        db.query(Incident)
        .filter(
            Incident.status == "ACTIVE"
        )
        .count()
    )

    deployed = (
        db.query(Volunteer)
        .filter(
            Volunteer.status == "DEPLOYED"
        )
        .count()
    )

    available = (
        db.query(Volunteer)
        .filter(
            Volunteer.status == "AVAILABLE"
        )
        .count()
    )

    return {
        "active_alerts": active_alerts,
        "volunteers_deployed": deployed,
        "available_volunteers": available,
        "status": "OPERATIONAL",
        "latency": "<50ms",
        "server_time": datetime.utcnow().isoformat(),
    }


# ============================================================
# REAL FUNDING
#
# raised = SUM(real successful donations)
#
# NO HARDCODED RAISED VALUE
# ============================================================

@app.get("/funds")
def get_funds(
    db: Session = Depends(get_db),
):

    funding = (
        db.query(Funding)
        .order_by(Funding.id.asc())
        .first()
    )

    target = (
        float(funding.target)
        if funding and funding.target is not None
        else 0.0
    )

    total_raised = (
        db.query(
            func.coalesce(
                func.sum(Donation.amount),
                0,
            )
        )
        .filter(
            Donation.status == "SUCCESS"
        )
        .scalar()
    )

    raised = float(total_raised or 0)

    donors = (
        db.query(Donation)
        .filter(
            Donation.status == "SUCCESS"
        )
        .count()
    )

    percentage = 0.0

    if target > 0:

        percentage = (
            raised / target
        ) * 100

    percentage = min(
        100,
        max(
            0,
            round(
                percentage,
                2,
            ),
        ),
    )

    return {
        "raised": raised,
        "target": target,
        "percentage": percentage,
        "donors": donors,
        "currency": "INR",
        "source": "database",
        "last_updated": datetime.utcnow().isoformat(),
    }


# ============================================================
# REAL DONATION
# ============================================================

@app.post("/webhook/donate")
def donate(
    data: DonationRequest,
    db: Session = Depends(get_db),
):

    amount = float(data.amount)

    if not math.isfinite(amount):

        raise HTTPException(
            status_code=400,
            detail="Invalid donation amount",
        )

    if amount <= 0:

        raise HTTPException(
            status_code=400,
            detail="Donation amount must be greater than zero",
        )

    purpose = (
        data.purpose.strip()
        if data.purpose
        else "Emergency Relief"
    )

    if not purpose:

        purpose = "Emergency Relief"

    donation = Donation(
        amount=amount,
        purpose=purpose,
        currency="INR",
        status="SUCCESS",
        created_at=datetime.utcnow(),
    )

    db.add(donation)

    db.commit()

    db.refresh(donation)

    funds = get_funds(db)

    return {
        "success": True,
        "message": "Donation recorded successfully.",
        "donation": {
            "id": donation.id,
            "amount": donation.amount,
            "purpose": donation.purpose,
            "currency": donation.currency,
            "status": donation.status,
            "created_at": donation.created_at.isoformat(),
        },
        "funding": funds,
    }


# ============================================================
# DONATION HISTORY
# ============================================================

@app.get("/donations")
def get_donations(
    db: Session = Depends(get_db),
):

    donations = (
        db.query(Donation)
        .filter(
            Donation.status == "SUCCESS"
        )
        .order_by(
            Donation.created_at.desc()
        )
        .limit(500)
        .all()
    )

    return [
        {
            "id": donation.id,
            "amount": donation.amount,
            "purpose": donation.purpose,
            "currency": donation.currency,
            "status": donation.status,
            "created_at": (
                donation.created_at.isoformat()
                if donation.created_at
                else None
            ),
        }
        for donation in donations
    ]


# ============================================================
# INCIDENT SERIALIZER
# ============================================================

def serialize_incident(
    incident: Incident,
):

    return {
        "id": incident.incident_code,
        "database_id": incident.id,

        "lat": incident.lat,
        "lng": incident.lng,

        "accuracy": incident.accuracy,

        "type": incident.type,

        "severity": incident.severity,

        "status": incident.status,

        "source": incident.source,

        "location_name": incident.location_name,

        "timestamp": (
            incident.created_at.isoformat()
            if incident.created_at
            else None
        ),

        "dispatched_at": (
            incident.dispatched_at.isoformat()
            if incident.dispatched_at
            else None
        ),
    }


# ============================================================
# REAL GPS SOS
# ============================================================

@app.post("/sos")
def create_sos(
    data: SOSRequest,
    db: Session = Depends(get_db),
):

    # --------------------------------------------------------
    # GPS VALIDATION
    # --------------------------------------------------------

    if not math.isfinite(data.lat):

        raise HTTPException(
            status_code=400,
            detail="Invalid latitude",
        )

    if not math.isfinite(data.lng):

        raise HTTPException(
            status_code=400,
            detail="Invalid longitude",
        )

    if not -90 <= data.lat <= 90:

        raise HTTPException(
            status_code=400,
            detail="Invalid latitude",
        )

    if not -180 <= data.lng <= 180:

        raise HTTPException(
            status_code=400,
            detail="Invalid longitude",
        )

    if (
        data.accuracy is not None
        and (
            not math.isfinite(data.accuracy)
            or data.accuracy < 0
        )
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid GPS accuracy",
        )

    # --------------------------------------------------------
    # CREATE INCIDENT
    # --------------------------------------------------------

    incident = Incident(
        incident_code="PENDING",
        lat=data.lat,
        lng=data.lng,
        accuracy=data.accuracy,
        type=data.type,
        severity="HIGH",
        status="ACTIVE",
        source=data.source,
        location_name=data.location_name,
        created_at=datetime.utcnow(),
    )

    db.add(incident)

    db.flush()

    incident.incident_code = (
        f"DR-{incident.id:06d}"
    )

    db.commit()

    db.refresh(incident)

    return {
        "success": True,

        "message":
            "Emergency SOS registered successfully.",

        "incident":
            serialize_incident(incident),

        "server_time":
            datetime.utcnow().isoformat(),
    }


# ============================================================
# INCIDENT LIST
# ============================================================

@app.get("/incidents")
def get_incidents(
    db: Session = Depends(get_db),
):

    rows = (
        db.query(Incident)
        .order_by(
            Incident.created_at.desc()
        )
        .limit(500)
        .all()
    )

    return [
        serialize_incident(x)
        for x in rows
    ]


# ============================================================
# SINGLE INCIDENT
# ============================================================

@app.get("/incidents/{incident_id}")
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
):

    incident = (
        db.query(Incident)
        .filter(
            Incident.incident_code
            == incident_id
        )
        .first()
    )

    if not incident:

        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return serialize_incident(
        incident
    )


# ============================================================
# DISTANCE
# ============================================================

def distance_km(
    lat1,
    lng1,
    lat2,
    lng2,
):

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    dlat = lat2_rad - lat1_rad

    dlng = math.radians(
        lng2 - lng1
    )

    a = (
        math.sin(dlat / 2) ** 2
        +
        math.cos(lat1_rad)
        *
        math.cos(lat2_rad)
        *
        math.sin(dlng / 2) ** 2
    )

    a = min(
        1,
        max(
            0,
            a,
        ),
    )

    return (
        6371
        *
        2
        *
        math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a),
        )
    )


# ============================================================
# VOLUNTEERS
# ============================================================

@app.get("/volunteers")
def get_volunteers(
    db: Session = Depends(get_db),
):

    rows = (
        db.query(Volunteer)
        .order_by(
            Volunteer.updated_at.desc()
        )
        .all()
    )

    return [
        {
            "id": x.volunteer_code,
            "name": x.name,
            "lat": x.lat,
            "lng": x.lng,
            "status": x.status,
            "incident_id": x.incident_id,
            "updated_at": (
                x.updated_at.isoformat()
                if x.updated_at
                else None
            ),
        }
        for x in rows
    ]


# ============================================================
# MEDICAL
# ============================================================

@app.get("/medical")
def get_medical(
    db: Session = Depends(get_db),
):

    rows = (
        db.query(ResponseTeam)
        .filter(
            ResponseTeam.team_type == "MEDICAL"
        )
        .all()
    )

    return [
        {
            "id": x.team_code,
            "name": x.name,
            "lat": x.lat,
            "lng": x.lng,
            "status": x.status,
            "incident_id": x.incident_id,
        }
        for x in rows
    ]


# ============================================================
# RESCUE
# ============================================================

@app.get("/rescue")
def get_rescue(
    db: Session = Depends(get_db),
):

    rows = (
        db.query(ResponseTeam)
        .filter(
            ResponseTeam.team_type == "RESCUE"
        )
        .all()
    )

    return [
        {
            "id": x.team_code,
            "name": x.name,
            "lat": x.lat,
            "lng": x.lng,
            "status": x.status,
            "incident_id": x.incident_id,
        }
        for x in rows
    ]


# ============================================================
# RESPONSE TEAM - MEDICAL
# ============================================================

@app.get("/response-teams/medical")
def response_medical(
    lat: float,
    lng: float,
    db: Session = Depends(get_db),
):

    teams = (
        db.query(ResponseTeam)
        .filter(
            ResponseTeam.team_type == "MEDICAL"
        )
        .all()
    )

    result = []

    for team in teams:

        distance = distance_km(
            lat,
            lng,
            team.lat,
            team.lng,
        )

        result.append({
            "id": team.team_code,
            "name": team.name,
            "lat": team.lat,
            "lng": team.lng,
            "status": team.status,
            "dist": round(
                distance,
                2,
            ),
        })

    return sorted(
        result,
        key=lambda x: x["dist"],
    )


# ============================================================
# RESPONSE TEAM - RESCUE
# ============================================================

@app.get("/response-teams/rescue")
def response_rescue(
    lat: float,
    lng: float,
    db: Session = Depends(get_db),
):

    teams = (
        db.query(ResponseTeam)
        .filter(
            ResponseTeam.team_type == "RESCUE"
        )
        .all()
    )

    result = []

    for team in teams:

        distance = distance_km(
            lat,
            lng,
            team.lat,
            team.lng,
        )

        result.append({
            "id": team.team_code,
            "name": team.name,
            "lat": team.lat,
            "lng": team.lng,
            "status": team.status,
            "dist": round(
                distance,
                2,
            ),
        })

    return sorted(
        result,
        key=lambda x: x["dist"],
    )


# ============================================================
# REAL DISPATCH
# ============================================================

@app.post(
    "/incidents/{incident_id}/dispatch"
)
def dispatch_incident(
    incident_id: str,
    data: DispatchRequest,
    db: Session = Depends(get_db),
):

    incident = (
        db.query(Incident)
        .filter(
            Incident.incident_code
            == incident_id
        )
        .first()
    )

    if not incident:

        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    if incident.status != "ACTIVE":

        raise HTTPException(
            status_code=400,
            detail="Incident is not active",
        )

    incident.dispatched_at = datetime.utcnow()

    requested_types = [
        str(x).upper()
        for x in data.requested_units
    ]

    dispatched = []

    # --------------------------------------------------------
    # VOLUNTEERS
    # --------------------------------------------------------

    if (
        not requested_types
        or "RESCUE" in requested_types
        or "SDRF" in requested_types
    ):

        volunteers = (
            db.query(Volunteer)
            .filter(
                Volunteer.status == "AVAILABLE"
            )
            .all()
        )

        volunteers = sorted(
            volunteers,
            key=lambda v: distance_km(
                incident.lat,
                incident.lng,
                v.lat,
                v.lng,
            ),
        )

        for volunteer in volunteers[:5]:

            distance = distance_km(
                incident.lat,
                incident.lng,
                volunteer.lat,
                volunteer.lng,
            )

            volunteer.status = "DEPLOYED"

            volunteer.incident_id = incident.id

            dispatched.append({
                "type": "VOLUNTEER",
                "id": volunteer.volunteer_code,
                "name": volunteer.name,
                "distance_km": round(
                    distance,
                    2,
                ),
            })

    # --------------------------------------------------------
    # RESPONSE TEAMS
    # --------------------------------------------------------

    teams = (
        db.query(ResponseTeam)
        .filter(
            ResponseTeam.status == "AVAILABLE"
        )
        .all()
    )

    for team in teams:

        if requested_types:

            if (
                team.team_type
                not in requested_types
                and not (
                    team.team_type == "RESCUE"
                    and "SDRF"
                    in requested_types
                )
            ):

                continue

        distance = distance_km(
            incident.lat,
            incident.lng,
            team.lat,
            team.lng,
        )

        team.status = "DISPATCHED"

        team.incident_id = incident.id

        dispatched.append({
            "type": team.team_type,
            "id": team.team_code,
            "name": team.name,
            "distance_km": round(
                distance,
                2,
            ),
        })

    incident.status = "DISPATCHED"

    db.commit()

    return {
        "success": True,

        "message":
            "Response dispatch request registered.",

        "incident_id":
            incident.incident_code,

        "status":
            incident.status,

        "dispatched_units":
            dispatched,

        "server_time":
            datetime.utcnow().isoformat(),
    }


# ============================================================
# UPDATE VOLUNTEER LOCATION
# ============================================================

@app.put(
    "/volunteers/{volunteer_id}/location"
)
def update_volunteer_location(
    volunteer_id: str,
    data: TeamLocationUpdate,
    db: Session = Depends(get_db),
):

    volunteer = (
        db.query(Volunteer)
        .filter(
            Volunteer.volunteer_code
            == volunteer_id
        )
        .first()
    )

    if not volunteer:

        raise HTTPException(
            status_code=404,
            detail="Volunteer not found",
        )

    if not -90 <= data.lat <= 90:

        raise HTTPException(
            status_code=400,
            detail="Invalid latitude",
        )

    if not -180 <= data.lng <= 180:

        raise HTTPException(
            status_code=400,
            detail="Invalid longitude",
        )

    volunteer.lat = data.lat

    volunteer.lng = data.lng

    volunteer.updated_at = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "id": volunteer_id,
        "lat": volunteer.lat,
        "lng": volunteer.lng,
    }


# ============================================================
# AI ANALYSIS
# ============================================================

@app.post("/ai/analyze")
def ai_analyze(
    data: AIAnalyzeRequest,
):

    text = data.text.lower()

    threat = "MODERATE"

    impact = {
        "infrastructure": "MODERATE",
        "medical": "MODERATE",
        "evac": "MODERATE",
    }

    actions = [
        "Monitor situation",
        "Alert local authorities",
    ]

    if "earthquake" in text:

        threat = "HIGH"

        impact = {
            "infrastructure": "HIGH",
            "medical": "HIGH",
            "evac": "HIGH",
        }

        actions = [
            "Activate earthquake response",
            "Check nearby medical facilities",
            "Establish safe evacuation routes",
        ]

    elif "flood" in text:

        threat = "CRITICAL"

        impact = {
            "infrastructure": "CRITICAL",
            "medical": "HIGH",
            "evac": "CRITICAL",
        }

        actions = [
            "Activate flood response",
            "Check evacuation routes",
            "Alert nearby residents",
        ]

    elif "fire" in text:

        threat = "HIGH"

        impact = {
            "infrastructure": "HIGH",
            "medical": "HIGH",
            "evac": "MODERATE",
        }

        actions = [
            "Activate fire response",
            "Alert nearby residents",
            "Establish evacuation route",
        ]

    elif "landslide" in text:

        threat = "HIGH"

        impact = {
            "infrastructure": "HIGH",
            "medical": "HIGH",
            "evac": "HIGH",
        }

        actions = [
            "Deploy rescue response",
            "Check affected roads",
            "Establish alternate evacuation route",
        ]

    return {
        "threat": threat,
        "impact": impact,
        "actions": actions,
    }


# ============================================================
# PARSER
# ============================================================

@app.post("/parse")
def parse_emergency(
    data: AIAnalyzeRequest,
):

    text = data.text.lower()

    if "earthquake" in text:

        return {
            "disaster_type": "EARTHQUAKE",
            "estimated_victims": "UNKNOWN",
            "urgency_level": "CRITICAL",
        }

    if "flood" in text:

        return {
            "disaster_type": "FLOOD",
            "estimated_victims": "UNKNOWN",
            "urgency_level": "HIGH",
        }

    if "fire" in text:

        return {
            "disaster_type": "FIRE",
            "estimated_victims": "UNKNOWN",
            "urgency_level": "HIGH",
        }

    if "landslide" in text:

        return {
            "disaster_type": "LANDSLIDE",
            "estimated_victims": "UNKNOWN",
            "urgency_level": "HIGH",
        }

    return {
        "disaster_type": "UNKNOWN",
        "estimated_victims": "UNKNOWN",
        "urgency_level": "MODERATE",
    }


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup():

    print(
        "🚨 Global Disaster Relief System API started"
    )

    print(
        "📡 Real-time incident API ready"
    )

    print(
        "📍 GPS SOS endpoint ready"
    )

    print(
        "💰 Real donation database ready"
    )

    print(
        "🚑 Response team API ready"
    )