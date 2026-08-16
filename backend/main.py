from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

# ---------------- CONFIG ----------------
SECRET_KEY = "supersecretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ---------------- DATABASE (SQLite) ----------------
SQLALCHEMY_DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

Base.metadata.create_all(bind=engine)

# ---------------- AUTH HELPERS (bcrypt) ----------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ---------------- DEPENDENCIES ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# ---------------- PYDANTIC MODELS ----------------
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ParsedResponse(BaseModel):
    disaster_type: str
    estimated_victims: str
    urgency_level: str

class DonationResponse(BaseModel):
    funds_raised: int
    percentage: int

class StatsResponse(BaseModel):
    active_alerts: int
    volunteers_deployed_1: int
    volunteers_deployed_2: int
    system_status: str
    data_latency: str

# ---------------- APP INIT ----------------
app = FastAPI()

# CORS FIX (BOTH localhost and 127.0.0.1 allowed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://disaster-app-30ll.onrender.com"   # <--- YE ADD KIYA
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- IN-MEMORY DASHBOARD DATA ----------------
dashboard_data = {
    "stats": {
        "active_alerts": 7,
        "volunteers_deployed_1": 210,
        "volunteers_deployed_2": 112,
        "system_status": "OPERATIONAL",
        "data_latency": "<50ms"
    },
    "funds": 325400,
    "percentage": 58,
    "verifications": [
        {"name": "Razorpay verification lo...", "status": "Successful"},
        {"name": "Stripe webhook OK", "status": "Successful"},
        {"name": "Volunteer ID V-741", "status": "Successful"},
        {"name": "Supply chain verified", "status": "Successful"},
        {"name": "Medical unit confirmed", "status": "Successful"},
        {"name": "Evac route cleared", "status": "Successful"}
    ]
}
# ---------------- AUTH HELPERS (bcrypt) ----------------
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# ---------------- AUTH ENDPOINTS ----------------
@app.post("/register", response_model=UserOut)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # ✅ FIX: Extra spaces/newlines hata diye
    clean_password = user.password.strip()
    
    if len(clean_password) > 72:
        raise HTTPException(status_code=400, detail="Password too long (max 72 chars)")
    
    hashed = get_password_hash(clean_password)
    new_user = User(username=user.username, email=user.email, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # ✅ FIX: Extra spaces/newlines hata diye
    clean_password = form_data.password.strip()
    
    # Debug prints (Ab yeh sahi dikhayega)
    print(f"🔍 Login attempt for username: {form_data.username}")
    if user:
        print(f"✅ User found: {user.username}")
        print(f"🔑 Stored hash: {user.hashed_password}")
        print(f"🧪 Password sent (repr): {repr(clean_password)}")  # Yeh dikhayega ki exact kya aaya
        print(f"🧪 Match result: {verify_password(clean_password, user.hashed_password)}")
    else:
        print("❌ User NOT found")

    if not user or not verify_password(clean_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/profile", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/profile")
def update_profile(email: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.email = email
    db.commit()
    return {"message": "Profile updated successfully"}

# ---------------- DASHBOARD ENDPOINTS ----------------
@app.get("/stats", response_model=StatsResponse)
def get_stats():
    s = dashboard_data["stats"]
    return StatsResponse(
        active_alerts=s["active_alerts"],
        volunteers_deployed_1=s["volunteers_deployed_1"],
        volunteers_deployed_2=s["volunteers_deployed_2"],
        system_status=s["system_status"],
        data_latency=s["data_latency"]
    )

@app.get("/verifications")
def get_verifications():
    return dashboard_data["verifications"]

@app.get("/funds")
def get_funds():
    return DonationResponse(
        funds_raised=dashboard_data["funds"],
        percentage=dashboard_data["percentage"]
    )

@app.post("/parse")
def parse_emergency(text: str) -> ParsedResponse:
    t = text.lower()
    if "collapse" in t or "building" in t:
        return ParsedResponse(disaster_type="STRUCTURAL COLLAPSE", estimated_victims="50-100", urgency_level="CRITICAL")
    elif "flood" in t or "water" in t:
        return ParsedResponse(disaster_type="FLOOD", estimated_victims="100-200", urgency_level="HIGH")
    elif "fire" in t:
        return ParsedResponse(disaster_type="FIRE", estimated_victims="10-30", urgency_level="HIGH")
    elif "earthquake" in t:
        return ParsedResponse(disaster_type="EARTHQUAKE", estimated_victims="200-500", urgency_level="CRITICAL")
    return ParsedResponse(disaster_type="UNKNOWN", estimated_victims="Unknown", urgency_level="MODERATE")

@app.post("/donate")
def donate(amount: int = 5000):
    dashboard_data["funds"] += amount
    dashboard_data["percentage"] = min(100, dashboard_data["percentage"] + 2)
    return DonationResponse(
        funds_raised=dashboard_data["funds"],
        percentage=dashboard_data["percentage"]
    )
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import bcrypt, math, random, time
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List, Optional

# ------------------ CONFIG & DB ------------------
SECRET_KEY = "supersecretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
SQLALCHEMY_DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

Base.metadata.create_all(bind=engine)

# ------------------ HELPERS ------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
def verify_password(plain, hashed): return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
def get_password_hash(password): return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
def create_access_token(data: dict): 
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=30)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# ------------------ PYDANTIC MODELS ------------------
class UserCreate(BaseModel): username: str; email: str; password: str
class Token(BaseModel): access_token: str; token_type: str
class IncidentCreate(BaseModel): lat: float; lng: float; type: str
class IncidentOut(BaseModel): id: str; lat: float; lng: float; radius: float; severity: str; status: str; timestamp: str

# ------------------ APP INIT & CORS ------------------
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://localhost:3002"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ------------------ IN-MEMORY DATA ------------------
dashboard_stats = {"active_alerts": 7, "volunteers_deployed": 210, "available_volunteers": 112, "status": "OPERATIONAL", "latency": "<50ms"}
donation_data = {"raised": 325400, "target": 500000}
verification_pipeline = [
    {"id": 1, "name": "Incident Received", "status": "Successful"},
    {"id": 2, "name": "Location Verified", "status": "Successful"},
    {"id": 3, "name": "Volunteer Verified", "status": "Successful"},
    {"id": 4, "name": "Medical Unit Confirmed", "status": "Processing"},
    {"id": 5, "name": "Supplies Verified", "status": "Processing"},
    {"id": 6, "name": "Evac Route Cleared", "status": "Pending"}
]
incidents = []
volunteers = [
    {"id": "V-741", "name": "Rajesh", "lat": 37.7750, "lng": -122.4200, "status": "AVAILABLE", "eta": 4},
    {"id": "V-742", "name": "Priya", "lat": 37.7730, "lng": -122.4180, "status": "AVAILABLE", "eta": 2},
    {"id": "V-743", "name": "Amit", "lat": 37.7760, "lng": -122.4210, "status": "DEPLOYED", "eta": 6},
    # ... assume 200+ volunteers in real DB. For demo, we use these.
]

# ------------------ AUTH ENDPOINTS ------------------
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first(): raise HTTPException(400, "User exists")
    new_user = User(username=user.username.strip(), email=user.email.strip(), hashed_password=get_password_hash(user.password.strip()))
    db.add(new_user); db.commit(); db.refresh(new_user); return new_user

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username.strip()).first()
    if not user or not verify_password(form_data.password.strip(), user.hashed_password): raise HTTPException(401, "Invalid creds")
    return {"access_token": create_access_token({"sub": user.username}), "token_type": "bearer"}

@app.get("/profile")
def get_profile(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try: payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM]); user = db.query(User).filter(User.username == payload.get("sub")).first(); return user
    except: raise HTTPException(401, "Invalid")

# ------------------ MAIN DASHBOARD ENDPOINTS ------------------
@app.get("/stats")
def get_stats():
    return dashboard_stats

@app.get("/funds")
def get_funds():
    return {"raised": donation_data["raised"], "target": donation_data["target"], "percentage": int((donation_data["raised"]/donation_data["target"])*100)}

@app.get("/verifications")
def get_verifications(): return verification_pipeline

@app.post("/webhook/donate")
def donate(amount: int = 5000):
    donation_data["raised"] += amount
    return get_funds()

# ------------------ AI INTELLIGENCE ------------------
@app.post("/ai/analyze")
def ai_analyze(text: str):
    text_lower = text.lower()
    threat = "MODERATE"; impact = {"infrastructure": "MODERATE", "medical": "MODERATE", "evac": "MODERATE"}
    actions = ["Monitor situation", "Alert local authorities"]
    if "earthquake" in text_lower:
        threat = "HIGH"; impact = {"infrastructure": "HIGH", "medical": "HIGH", "evac": "HIGH"}
        actions = ["Deploy 25 rescue volunteers", "Activate 3 medical units", "Open nearest shelter", "Establish 5 km evacuation zone"]
    elif "flood" in text_lower:
        threat = "CRITICAL"; impact = {"infrastructure": "CRITICAL", "medical": "HIGH", "evac": "CRITICAL"}
        actions = ["Deploy 40 rescue volunteers", "Activate 5 medical boats", "Open 2 shelters", "Evacuate 10 km zone"]
    return {"threat": threat, "impact": impact, "actions": actions}

# ------------------ SOS / EMERGENCY DETECTION ------------------
@app.post("/sos")
def trigger_sos(incident: IncidentCreate):
    # 1. Create Incident
    inc_id = f"DR-{random.randint(1000,9999)}"
    radius = 5.0
    severity = "HIGH" if incident.type == "Earthquake" else "MODERATE"
    new_incident = {"id": inc_id, "lat": incident.lat, "lng": incident.lng, "radius": radius, "severity": severity, "status": "ACTIVE", "timestamp": datetime.now().isoformat()}
    incidents.append(new_incident)
    
    # 2. Update Stats
    dashboard_stats["active_alerts"] += 1
    # 3. Find nearest volunteers (simulated logic)
    nearby = []
    for v in volunteers:
        dist = math.hypot(v["lat"] - incident.lat, v["lng"] - incident.lng) * 111  # km approx
        if dist <= radius and v["status"] == "AVAILABLE":
            v["status"] = "DEPLOYED"
            v["eta"] = int(dist / 30 * 60) # 30km/h speed
            nearby.append({"id": v["id"], "name": v["name"], "dist": round(dist,1), "eta": v["eta"]})
    # Update deployed count
    dashboard_stats["volunteers_deployed"] += len(nearby)
    dashboard_stats["available_volunteers"] -= len(nearby)
    
    return {"incident": new_incident, "nearby_volunteers": nearby, "total_responders": len(nearby), "alert_count": dashboard_stats["active_alerts"]}

@app.get("/incidents")
def get_incidents(): return incidents
# Add these new lists after existing ones
volunteers = [
    {"id": "V-741", "name": "Rajesh", "lat": 37.7750, "lng": -122.4200, "status": "AVAILABLE", "dist": 1.2, "eta": 4},
    {"id": "V-742", "name": "Priya", "lat": 37.7730, "lng": -122.4180, "status": "AVAILABLE", "dist": 0.8, "eta": 2},
    {"id": "V-743", "name": "Amit", "lat": 37.7760, "lng": -122.4210, "status": "AVAILABLE", "dist": 2.5, "eta": 6}
]
medical_units = [{"id": "A-12", "lat": 37.7720, "lng": -122.4150, "status": "AVAILABLE"}]
rescue_teams = [{"id": "R-07", "lat": 37.7780, "lng": -122.4220, "status": "AVAILABLE"}]

# Update dashboard_stats to include available_volunteers
dashboard_stats = {"active_alerts": 7, "volunteers_deployed": 0, "available_volunteers": 3, "status": "OPERATIONAL", "latency": "<50ms"}

# Update /sos endpoint
@app.post("/sos")
def trigger_sos(incident: IncidentCreate):
    inc_id = f"DR-{random.randint(1000,9999)}"
    radius = 5.0
    severity = "HIGH"
    new_incident = {"id": inc_id, "lat": incident.lat, "lng": incident.lng, "radius": radius, "severity": severity, "status": "ACTIVE", "timestamp": datetime.now().isoformat(), "type": incident.type, "magnitude": 6.4}
    incidents.append(new_incident)
    
    dashboard_stats["active_alerts"] += 1
    # Assign volunteers
    assigned_count = 0
    for v in volunteers:
        dist = math.hypot(v["lat"] - incident.lat, v["lng"] - incident.lng) * 111
        if dist <= radius and v["status"] == "AVAILABLE":
            v["status"] = "DEPLOYED"
            v["dist"] = round(dist, 1)
            v["eta"] = int(dist / 30 * 60)
            assigned_count += 1
    dashboard_stats["volunteers_deployed"] += assigned_count
    dashboard_stats["available_volunteers"] -= assigned_count
    
    return {
        "incident": new_incident,
        "volunteers": assigned_count,
        "medical": len(medical_units),
        "rescue": len(rescue_teams),
        "hospitals": 4
    }

@app.get("/volunteers")
def get_volunteers(): return volunteers

@app.get("/medical")
def get_medical(): return medical_units

@app.get("/rescue")
def get_rescue(): return rescue_teams

# Update /verifications with dynamic statuses
@app.get("/verifications")
def get_verifications():
    # Simulate pipeline progress
    statuses = ["Successful", "Successful", "Successful", "Processing", "Processing", "Failed"]
    return [
        {"id": 1, "name": "Incident Received", "status": statuses[0]},
        {"id": 2, "name": "Location Verified", "status": statuses[1]},
        {"id": 3, "name": "Volunteer Verified", "status": statuses[2]},
        {"id": 4, "name": "Medical Unit", "status": statuses[3]},
        {"id": 5, "name": "Supplies", "status": statuses[4]},
        {"id": 6, "name": "Evac Route", "status": statuses[5]}
    ]