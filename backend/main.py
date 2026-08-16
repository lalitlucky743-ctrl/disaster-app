# ============================================================
# GLOBAL DISASTER RELIEF SYSTEM
# FastAPI Backend
# ============================================================

import os
import math
import random
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
)

from fastapi.middleware.cors import CORSMiddleware

from fastapi.security import (
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
)

from pydantic import BaseModel, EmailStr

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
)

from sqlalchemy.exc import IntegrityError

from sqlalchemy.orm import (
    sessionmaker,
    Session,
    declarative_base,
)


# ============================================================
# CONFIGURATION
# ============================================================

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "change-this-secret-key-in-production"
)

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 30


# ============================================================
# DATABASE
# ============================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./users.db"
)

# Render/Postgres URLs sometimes start with postgres://
# SQLAlchemy expects postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql://",
        1,
    )


connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {
        "check_same_thread": False
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
# DATABASE MODEL
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


Base.metadata.create_all(bind=engine)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Global Disaster Relief System",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

# IMPORTANT:
# Frontend is on Vercel.
# Backend is on Render.
#
# We allow:
# - local Vite development
# - localhost
# - Vercel deployments
#
# Render URL itself does NOT need to be in allow_origins
# because the browser origin is the FRONTEND URL.

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3002",
]

app.add_middleware(
    CORSMiddleware,

    allow_origins=ALLOWED_ORIGINS,

    # Allows any Vercel *.vercel.app deployment.
    allow_origin_regex=r"https://.*\.vercel\.app",

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# OAUTH / JWT
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login"
)


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================
# PASSWORD HELPERS
# ============================================================

def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:

    try:

        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )

    except Exception:

        return False


def get_password_hash(
    password: str,
) -> str:

    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


# ============================================================
# JWT
# ============================================================

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
):

    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta
        or timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    to_encode.update(
        {
            "exp": expire
        }
    )

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


# ============================================================
# CURRENT USER
# ============================================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        },
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
        .filter(
            User.username == username
        )
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

    class Config:
        from_attributes = True


class Token(BaseModel):

    access_token: str
    token_type: str


class ProfileUpdate(BaseModel):

    email: EmailStr


class AIAnalyzeRequest(BaseModel):

    text: str


class DonationRequest(BaseModel):

    amount: int
    purpose: Optional[str] = "Medical"


class IncidentCreate(BaseModel):

    lat: float
    lng: float
    type: str = "Earthquake"


class ParseRequest(BaseModel):

    text: str


# ============================================================
# DASHBOARD DATA
# ============================================================

dashboard_stats = {

    "active_alerts": 7,

    "volunteers_deployed": 0,

    "available_volunteers": 3,

    "status": "OPERATIONAL",

    "latency": "<50ms",
}


donation_data = {

    "raised": 325400,

    "target": 500000,
}


verification_pipeline = [

    {
        "id": 1,
        "name": "Incident Received",
        "status": "Successful",
    },

    {
        "id": 2,
        "name": "Location Verified",
        "status": "Successful",
    },

    {
        "id": 3,
        "name": "Volunteer Verified",
        "status": "Successful",
    },

    {
        "id": 4,
        "name": "Medical Unit",
        "status": "Processing",
    },

    {
        "id": 5,
        "name": "Supplies",
        "status": "Processing",
    },

    {
        "id": 6,
        "name": "Evac Route",
        "status": "Pending",
    },
]


# ============================================================
# INCIDENTS
# ============================================================

incidents = []


# ============================================================
# VOLUNTEERS
# ============================================================

volunteers = [

    {
        "id": "V-741",
        "name": "Rajesh",
        "lat": 29.6000,
        "lng": 79.6600,
        "status": "AVAILABLE",
        "dist": 1.2,
        "eta": 4,
    },

    {
        "id": "V-742",
        "name": "Priya",
        "lat": 29.5950,
        "lng": 79.6550,
        "status": "AVAILABLE",
        "dist": 0.8,
        "eta": 2,
    },

    {
        "id": "V-743",
        "name": "Amit",
        "lat": 29.6020,
        "lng": 79.6650,
        "status": "AVAILABLE",
        "dist": 2.5,
        "eta": 6,
    },
]


# ============================================================
# MEDICAL UNITS
# ============================================================

medical_units = [

    {
        "id": "A-12",
        "lat": 29.5980,
        "lng": 79.6580,
        "status": "AVAILABLE",
    },

]


# ============================================================
# RESCUE TEAMS
# ============================================================

rescue_teams = [

    {
        "id": "R-07",
        "lat": 29.6030,
        "lng": 79.6620,
        "status": "AVAILABLE",
    },

]


# ============================================================
# ROOT / HEALTH CHECK
# ============================================================

@app.get("/")
def root():

    return {
        "status": "online",
        "service": "Global Disaster Relief System",
        "backend": "FastAPI",
        "version": "1.0.0",
    }


@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "disaster-relief-api",
        "timestamp": datetime.utcnow().isoformat(),
    }


# ============================================================
# AUTH - REGISTER
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


    if not password:

        raise HTTPException(
            status_code=400,
            detail="Password is required",
        )


    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters",
        )


    # bcrypt limitation
    if len(password.encode("utf-8")) > 72:

        raise HTTPException(
            status_code=400,
            detail="Password must be 72 characters or less",
        )


    existing_username = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )

    if existing_username:

        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )


    existing_email = (
        db.query(User)
        .filter(
            User.email == email
        )
        .first()
    )

    if existing_email:

        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )


    hashed_password = get_password_hash(
        password
    )


    new_user = User(

        username=username,

        email=email,

        hashed_password=hashed_password,
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
# AUTH - LOGIN
# ============================================================

@app.post(
    "/login",
    response_model=Token,
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):

    username = form_data.username.strip()

    password = form_data.password.strip()


    user = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )


    if not user:

        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
        )


    if not verify_password(
        password,
        user.hashed_password,
    ):

        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
        )


    access_token = create_access_token(
        data={
            "sub": user.username
        }
    )


    return {

        "access_token": access_token,

        "token_type": "bearer",
    }


# ============================================================
# PROFILE
# ============================================================

@app.get(
    "/profile",
    response_model=UserOut,
)
def get_profile(
    current_user: User = Depends(
        get_current_user
    ),
):

    return current_user


# ============================================================
# UPDATE PROFILE
# ============================================================

@app.put("/profile")
def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    new_email = str(
        data.email
    ).strip().lower()


    existing_email = (
        db.query(User)
        .filter(
            User.email == new_email,
            User.id != current_user.id,
        )
        .first()
    )


    if existing_email:

        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )


    current_user.email = new_email

    db.commit()

    db.refresh(current_user)


    return {

        "message": "Profile updated successfully",

        "user": {

            "id": current_user.id,

            "username": current_user.username,

            "email": current_user.email,
        },
    }


# ============================================================
# STATS
# ============================================================

@app.get("/stats")
def get_stats():

    return dashboard_stats


# ============================================================
# FUNDS
# ============================================================

@app.get("/funds")
def get_funds():

    raised = donation_data["raised"]

    target = donation_data["target"]


    percentage = int(
        (raised / target) * 100
    ) if target > 0 else 0


    return {

        "raised": raised,

        "target": target,

        "percentage": min(
            100,
            percentage,
        ),
    }


# ============================================================
# DONATION
# ============================================================

@app.post("/webhook/donate")
def donate(
    data: DonationRequest,
):

    if data.amount < 1:

        raise HTTPException(
            status_code=400,
            detail="Donation amount must be greater than 0",
        )


    donation_data["raised"] += data.amount


    return get_funds()


# ============================================================
# VERIFICATION PIPELINE
# ============================================================

@app.get("/verifications")
def get_verifications():

    return verification_pipeline


# ============================================================
# PARSER
# ============================================================

@app.post("/parse")
def parse_emergency(
    data: ParseRequest,
):

    text = data.text.lower()


    if (
        "collapse" in text
        or "building" in text
    ):

        return {

            "disaster_type":
                "STRUCTURAL COLLAPSE",

            "estimated_victims":
                "50-100",

            "urgency_level":
                "CRITICAL",
        }


    if (
        "flood" in text
        or "water" in text
    ):

        return {

            "disaster_type":
                "FLOOD",

            "estimated_victims":
                "100-200",

            "urgency_level":
                "HIGH",
        }


    if "fire" in text:

        return {

            "disaster_type":
                "FIRE",

            "estimated_victims":
                "10-30",

            "urgency_level":
                "HIGH",
        }


    if "earthquake" in text:

        return {

            "disaster_type":
                "EARTHQUAKE",

            "estimated_victims":
                "200-500",

            "urgency_level":
                "CRITICAL",
        }


    return {

        "disaster_type":
            "UNKNOWN",

        "estimated_victims":
            "Unknown",

        "urgency_level":
            "MODERATE",
    }


# ============================================================
# AI DISASTER INTELLIGENCE
# ============================================================

@app.post("/ai/analyze")
def ai_analyze(
    data: AIAnalyzeRequest,
):

    text = data.text.lower()


    threat = "MODERATE"


    impact = {

        "infrastructure":
            "MODERATE",

        "medical":
            "MODERATE",

        "evac":
            "MODERATE",
    }


    actions = [

        "Monitor situation",

        "Alert local authorities",
    ]


    # --------------------------------------------------------
    # EARTHQUAKE
    # --------------------------------------------------------

    if "earthquake" in text:

        threat = "HIGH"

        impact = {

            "infrastructure":
                "HIGH",

            "medical":
                "HIGH",

            "evac":
                "HIGH",
        }


        actions = [

            "Deploy 25 rescue volunteers",

            "Activate 3 medical units",

            "Open nearest shelter",

            "Establish 5 km evacuation zone",
        ]


    # --------------------------------------------------------
    # FLOOD
    # --------------------------------------------------------

    elif "flood" in text:

        threat = "CRITICAL"

        impact = {

            "infrastructure":
                "CRITICAL",

            "medical":
                "HIGH",

            "evac":
                "CRITICAL",
        }


        actions = [

            "Deploy 40 rescue volunteers",

            "Activate 5 medical boats",

            "Open 2 shelters",

            "Evacuate 10 km zone",
        ]


    # --------------------------------------------------------
    # FIRE
    # --------------------------------------------------------

    elif "fire" in text:

        threat = "HIGH"

        impact = {

            "infrastructure":
                "HIGH",

            "medical":
                "HIGH",

            "evac":
                "MODERATE",
        }


        actions = [

            "Deploy fire response teams",

            "Activate medical units",

            "Establish safe evacuation route",

            "Alert nearby residents",
        ]


    # --------------------------------------------------------
    # LANDSLIDE
    # --------------------------------------------------------

    elif "landslide" in text:

        threat = "HIGH"

        impact = {

            "infrastructure":
                "HIGH",

            "medical":
                "HIGH",

            "evac":
                "HIGH",
        }


        actions = [

            "Deploy rescue teams",

            "Block affected roads",

            "Check nearby settlements",

            "Establish alternate evacuation route",
        ]


    return {

        "threat": threat,

        "impact": impact,

        "actions": actions,
    }


# ============================================================
# SOS
# ============================================================

@app.post("/sos")
def trigger_sos(
    incident: IncidentCreate,
):

    incident_id = (
        f"DR-{random.randint(1000, 9999)}"
    )


    radius = 5.0


    severity = (

        "HIGH"

        if incident.type.lower()
        in [
            "earthquake",
            "fire",
            "landslide",
        ]

        else "MODERATE"
    )


    new_incident = {

        "id": incident_id,

        "lat": incident.lat,

        "lng": incident.lng,

        "radius": radius,

        "severity": severity,

        "status": "ACTIVE",

        "timestamp":
            datetime.utcnow().isoformat(),

        "type": incident.type,

        "magnitude":
            6.4
            if incident.type.lower()
            == "earthquake"
            else None,

        "volunteers": 0,

        "medical": len(medical_units),

        "rescue": len(rescue_teams),

        "hospitals": 4,
    }


    incidents.append(
        new_incident
    )


    # Increase active alerts
    dashboard_stats[
        "active_alerts"
    ] += 1


    # --------------------------------------------------------
    # FIND NEARBY VOLUNTEERS
    # --------------------------------------------------------

    assigned_volunteers = []


    for volunteer in volunteers:

        if volunteer["status"] != "AVAILABLE":
            continue


        distance = (
            math.hypot(
                volunteer["lat"]
                - incident.lat,

                volunteer["lng"]
                - incident.lng,
            )
            * 111
        )


        if distance <= radius:

            volunteer["status"] = "DEPLOYED"

            volunteer["dist"] = round(
                distance,
                1,
            )


            volunteer["eta"] = max(
                1,
                int(
                    distance
                    / 30
                    * 60
                ),
            )


            assigned_volunteers.append(
                {
                    "id":
                        volunteer["id"],

                    "name":
                        volunteer["name"],

                    "dist":
                        volunteer["dist"],

                    "eta":
                        volunteer["eta"],
                }
            )


    assigned_count = len(
        assigned_volunteers
    )


    new_incident[
        "volunteers"
    ] = assigned_count


    dashboard_stats[
        "volunteers_deployed"
    ] += assigned_count


    dashboard_stats[
        "available_volunteers"
    ] = sum(
        1
        for v in volunteers
        if v["status"] == "AVAILABLE"
    )


    return {

        "incident":
            new_incident,

        "nearby_volunteers":
            assigned_volunteers,

        "volunteers":
            assigned_count,

        "medical":
            len(medical_units),

        "rescue":
            len(rescue_teams),

        "hospitals":
            4,

        "total_responders":
            assigned_count,

        "alert_count":
            dashboard_stats[
                "active_alerts"
            ],
    }


# ============================================================
# INCIDENTS
# ============================================================

@app.get("/incidents")
def get_incidents():

    return incidents


# ============================================================
# VOLUNTEERS
# ============================================================

@app.get("/volunteers")
def get_volunteers():

    return volunteers


# ============================================================
# MEDICAL UNITS
# ============================================================

@app.get("/medical")
def get_medical():

    return medical_units


# ============================================================
# RESCUE TEAMS
# ============================================================

@app.get("/rescue")
def get_rescue():

    return rescue_teams


# ============================================================
# DISPATCH
# ============================================================

@app.post("/dispatch")
def dispatch_units():

    deployed = 0


    for volunteer in volunteers:

        if volunteer["status"] == "AVAILABLE":

            volunteer["status"] = "DEPLOYED"

            deployed += 1


    dashboard_stats[
        "volunteers_deployed"
    ] += deployed


    dashboard_stats[
        "available_volunteers"
    ] = sum(
        1
        for v in volunteers
        if v["status"] == "AVAILABLE"
    )


    return {

        "message":
            "Nearby units dispatched successfully",

        "deployed":
            deployed,

        "status":
            "DISPATCHED",
    }


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    print(
        "🚨 Global Disaster Relief System API started"
    )

    print(
        "🌐 CORS configured for Vercel + localhost"
    )

    print(
        "📡 API is ready"
    )