from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import uuid
from datetime import datetime
import base64
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Card rank configurations
CARD_RANKS = {
    "K": {"name": "King", "label": "Deep Space", "value": 13, "prompt": "A high-fidelity vibrant semi-realistic digital painting of a space station near the Moon in a black starfield with stars and Earth visible in the distance. No text."},
    "Q": {"name": "Queen", "label": "Orbit", "value": 12, "prompt": "A high-fidelity vibrant semi-realistic digital painting of a satellite orbiting Earth with the curvature of the planet visible below and the darkness of space above. No text."},
    "J": {"name": "Jack", "label": "20km", "value": 11, "prompt": "A high-fidelity vibrant semi-realistic digital painting of fighter jets flying at high altitude with clouds below and deep blue sky transitioning to space above. No text."},
    "10": {"name": "Ten", "label": "10km", "value": 10, "prompt": "A high-fidelity vibrant semi-realistic digital painting of commercial airplanes flying through white fluffy clouds with blue sky all around. No text."},
    "9": {"name": "Nine", "label": "1km", "value": 9, "prompt": "A high-fidelity vibrant semi-realistic digital painting of colorful hot air balloons floating over a beautiful landscape with rolling hills and small towns below. No text."},
    "8": {"name": "Eight", "label": "100m", "value": 8, "prompt": "A high-fidelity vibrant semi-realistic digital painting of birds and colorful kites flying in a breezy sky with some light clouds and trees visible below. No text."},
    "7": {"name": "Seven", "label": "Surface", "value": 7, "prompt": "A high-fidelity vibrant semi-realistic digital painting of a perfectly split horizon line - half bright blue sky above and half lush green grass below, showing ground level. No text."},
    "6": {"name": "Six", "label": "-10m", "value": 6, "prompt": "A high-fidelity vibrant semi-realistic digital painting of underground tree roots and rabbit burrows with earthy brown tones and small roots intertwining through soil. No text."},
    "5": {"name": "Five", "label": "-1km", "value": 5, "prompt": "A high-fidelity vibrant semi-realistic digital painting of dark underground mines and caves illuminated by glowing lanterns, showing rocky walls and mining tunnels. No text."},
    "4": {"name": "Four", "label": "-5km", "value": 4, "prompt": "A high-fidelity vibrant semi-realistic digital painting of dinosaur fossils embedded in layered rock formations with ancient bones visible. No text."},
    "3": {"name": "Three", "label": "Mantle", "value": 3, "prompt": "A high-fidelity vibrant semi-realistic digital painting of a glowing orange magma chamber deep underground with flowing lava and intense heat. No text."},
    "2": {"name": "Two", "label": "Outer Core", "value": 2, "prompt": "A high-fidelity vibrant semi-realistic digital painting of swirling metallic liquid iron in Earth's outer core with silver and orange tones. No text."},
    "A": {"name": "Ace", "label": "Center of Earth", "value": 1, "prompt": "A high-fidelity vibrant semi-realistic digital painting of a solid glowing white-blue crystalline ball representing Earth's inner core with intense energy. No text."}
}

SUIT_COLORS = {
    "hearts": {"name": "Hearts", "color": "#E0115F", "symbol": "♥"},
    "spades": {"name": "Spades", "color": "#00FFFF", "symbol": "♠"},
    "diamonds": {"name": "Diamonds", "color": "#FFD700", "symbol": "♦"},
    "clubs": {"name": "Clubs", "color": "#228B22", "symbol": "♣"}
}

# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class CardImage(BaseModel):
    rank: str
    image_base64: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GenerateImageRequest(BaseModel):
    rank: str

class GameRoom(BaseModel):
    room_code: str
    host_name: str
    players: List[Dict[str, Any]] = []
    game_state: Optional[Dict[str, Any]] = None
    status: str = "waiting"  # waiting, playing, finished
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CreateRoomRequest(BaseModel):
    host_name: str

class JoinRoomRequest(BaseModel):
    room_code: str
    player_name: str

class PlayCardRequest(BaseModel):
    room_code: str
    player_id: str
    card: Dict[str, str]  # {rank: "7", suit: "hearts"}

class PassTurnRequest(BaseModel):
    room_code: str
    player_id: str

# Helper functions
def generate_room_code():
    import random
    import string
    return ''.join(random.choices(string.ascii_uppercase, k=4))

def create_deck():
    """Create a standard 52-card deck"""
    deck = []
    for suit in SUIT_COLORS.keys():
        for rank in CARD_RANKS.keys():
            deck.append({"rank": rank, "suit": suit})
    return deck

def shuffle_deck(deck):
    import random
    random.shuffle(deck)
    return deck

def deal_cards(deck, num_players):
    """Deal cards evenly to players"""
    hands = [[] for _ in range(num_players)]
    for i, card in enumerate(deck):
        hands[i % num_players].append(card)
    return hands

def find_starting_player(players):
    """Find player with 7 of hearts"""
    for i, player in enumerate(players):
        for card in player.get("hand", []):
            if card["rank"] == "7" and card["suit"] == "hearts":
                return i
    return 0

def get_playable_cards(board_state, player_hand):
    """Determine which cards a player can play"""
    playable = []
    
    for card in player_hand:
        suit = card["suit"]
        rank = card["rank"]
        rank_value = CARD_RANKS[rank]["value"]
        
        suit_state = board_state.get(suit, {"low": None, "high": None, "has_seven": False})
        
        # 7 can always be played if not already on board
        if rank == "7" and not suit_state.get("has_seven", False):
            playable.append(card)
            continue
        
        # If 7 is on the board, check if this card can be played
        if suit_state.get("has_seven", False):
            low = suit_state.get("low", 6)  # lowest card value played (going down from 6)
            high = suit_state.get("high", 8)  # highest card value played (going up from 8)
            
            # Can play one below the current low (going towards Ace)
            if rank_value == low - 1:
                playable.append(card)
            # Can play one above the current high (going towards King)
            elif rank_value == high + 1:
                playable.append(card)
    
    return playable

def initialize_game_state(players):
    """Initialize the game state with dealt cards"""
    deck = shuffle_deck(create_deck())
    hands = deal_cards(deck, len(players))
    
    # Assign hands to players
    for i, hand in enumerate(hands):
        players[i]["hand"] = hand
    
    # Find who has 7 of hearts
    starting_player = find_starting_player(players)
    
    return {
        "board": {
            "hearts": {"low": None, "high": None, "has_seven": False, "cards": []},
            "spades": {"low": None, "high": None, "has_seven": False, "cards": []},
            "diamonds": {"low": None, "high": None, "has_seven": False, "cards": []},
            "clubs": {"low": None, "high": None, "has_seven": False, "cards": []}
        },
        "current_player_index": starting_player,
        "players": players,
        "winner": None,
        "last_action": f"{players[starting_player]['name']} goes first (has 7♥)",
        "turn_number": 1
    }

def play_card_logic(game_state, player_id, card):
    """Process playing a card"""
    players = game_state["players"]
    current_index = game_state["current_player_index"]
    
    # Verify it's this player's turn
    if players[current_index]["id"] != player_id:
        raise ValueError("Not your turn")
    
    player = players[current_index]
    suit = card["suit"]
    rank = card["rank"]
    rank_value = CARD_RANKS[rank]["value"]
    
    # Check if player has this card
    card_found = False
    for i, hand_card in enumerate(player["hand"]):
        if hand_card["rank"] == rank and hand_card["suit"] == suit:
            player["hand"].pop(i)
            card_found = True
            break
    
    if not card_found:
        raise ValueError("You don't have this card")
    
    # Validate the play
    board = game_state["board"]
    suit_state = board[suit]
    
    if rank == "7":
        if suit_state["has_seven"]:
            raise ValueError("7 already played for this suit")
        suit_state["has_seven"] = True
        suit_state["low"] = 6
        suit_state["high"] = 8
        suit_state["cards"].append(card)
    else:
        if not suit_state["has_seven"]:
            raise ValueError("Must play 7 first for this suit")
        
        if rank_value == suit_state["low"] - 1:
            suit_state["low"] = rank_value
            suit_state["cards"].append(card)
        elif rank_value == suit_state["high"] + 1:
            suit_state["high"] = rank_value
            suit_state["cards"].append(card)
        else:
            raise ValueError("Invalid play - card must extend the sequence")
    
    # Check for winner
    if len(player["hand"]) == 0:
        game_state["winner"] = player["id"]
        game_state["last_action"] = f"{player['name']} wins! 🎉"
    else:
        # Move to next player
        game_state["current_player_index"] = (current_index + 1) % len(players)
        game_state["turn_number"] += 1
        next_player = players[game_state["current_player_index"]]
        game_state["last_action"] = f"{player['name']} played {rank}{SUIT_COLORS[suit]['symbol']}"
    
    return game_state

def pass_turn_logic(game_state, player_id):
    """Process passing a turn"""
    players = game_state["players"]
    current_index = game_state["current_player_index"]
    
    if players[current_index]["id"] != player_id:
        raise ValueError("Not your turn")
    
    player = players[current_index]
    
    # Check if player actually can't play
    playable = get_playable_cards(game_state["board"], player["hand"])
    if len(playable) > 0:
        raise ValueError("You have playable cards - cannot pass")
    
    # Move to next player
    game_state["current_player_index"] = (current_index + 1) % len(players)
    game_state["turn_number"] += 1
    game_state["last_action"] = f"{player['name']} passed"
    
    return game_state

# Routes
@api_router.get("/")
async def root():
    return {"message": "Strata 7 - Badam Satti Game API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@api_router.get("/card-config")
async def get_card_config():
    """Get card configuration for frontend"""
    return {
        "ranks": CARD_RANKS,
        "suits": SUIT_COLORS
    }

# Image Generation
@api_router.post("/generate-card-image")
async def generate_card_image(request: GenerateImageRequest):
    """Generate a card image using OpenAI"""
    rank = request.rank.upper()
    if rank not in CARD_RANKS:
        raise HTTPException(status_code=400, detail=f"Invalid rank: {rank}")
    
    # Check if already generated
    existing = await db.card_images.find_one({"rank": rank})
    if existing:
        return {"rank": rank, "image_base64": existing["image_base64"], "cached": True}
    
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="API key not configured")
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        prompt = CARD_RANKS[rank]["prompt"]
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            
            # Save to database
            await db.card_images.insert_one({
                "rank": rank,
                "image_base64": image_base64,
                "created_at": datetime.utcnow()
            })
            
            return {"rank": rank, "image_base64": image_base64, "cached": False}
        else:
            raise HTTPException(status_code=500, detail="No image was generated")
            
    except Exception as e:
        logging.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/card-images")
async def get_all_card_images():
    """Get all generated card images"""
    images = await db.card_images.find().to_list(100)
    return [{"rank": img["rank"], "image_base64": img["image_base64"]} for img in images]

@api_router.get("/card-images/{rank}")
async def get_card_image(rank: str):
    """Get a specific card image"""
    rank = rank.upper()
    image = await db.card_images.find_one({"rank": rank})
    if image:
        return {"rank": rank, "image_base64": image["image_base64"]}
    raise HTTPException(status_code=404, detail="Image not found")

# Game Room Management
@api_router.post("/rooms/create")
async def create_room(request: CreateRoomRequest):
    """Create a new game room"""
    room_code = generate_room_code()
    
    # Ensure unique room code
    while await db.game_rooms.find_one({"room_code": room_code}):
        room_code = generate_room_code()
    
    player_id = str(uuid.uuid4())
    host_player = {
        "id": player_id,
        "name": request.host_name,
        "is_host": True,
        "hand": []
    }
    
    room = {
        "room_code": room_code,
        "host_name": request.host_name,
        "players": [host_player],
        "game_state": None,
        "status": "waiting",
        "created_at": datetime.utcnow()
    }
    
    result = await db.game_rooms.insert_one(room)
    
    # Return room without _id for JSON serialization
    room_response = {
        "room_code": room_code,
        "host_name": request.host_name,
        "players": [host_player],
        "game_state": None,
        "status": "waiting",
        "created_at": room["created_at"].isoformat()
    }
    
    return {
        "room_code": room_code,
        "player_id": player_id,
        "player": host_player,
        "room": room_response
    }

@api_router.post("/rooms/join")
async def join_room(request: JoinRoomRequest):
    """Join an existing game room"""
    room = await db.game_rooms.find_one({"room_code": request.room_code.upper()})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game already in progress")
    
    if len(room["players"]) >= 4:
        raise HTTPException(status_code=400, detail="Room is full")
    
    # Check for duplicate name
    for player in room["players"]:
        if player["name"].lower() == request.player_name.lower():
            raise HTTPException(status_code=400, detail="Name already taken in this room")
    
    player_id = str(uuid.uuid4())
    new_player = {
        "id": player_id,
        "name": request.player_name,
        "is_host": False,
        "hand": []
    }
    
    room["players"].append(new_player)
    
    await db.game_rooms.update_one(
        {"room_code": request.room_code.upper()},
        {"$set": {"players": room["players"]}}
    )
    
    # Format room for response
    room_response = {
        "room_code": room["room_code"],
        "host_name": room["host_name"],
        "players": room["players"],
        "game_state": room.get("game_state"),
        "status": room["status"],
        "created_at": room["created_at"].isoformat() if isinstance(room["created_at"], datetime) else room["created_at"]
    }
    
    return {
        "room_code": room["room_code"],
        "player_id": player_id,
        "player": new_player,
        "room": room_response
    }

@api_router.get("/rooms/{room_code}")
async def get_room(room_code: str):
    """Get room state"""
    room = await db.game_rooms.find_one({"room_code": room_code.upper()})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Format for JSON serialization
    return {
        "room_code": room["room_code"],
        "host_name": room["host_name"],
        "players": room["players"],
        "game_state": room.get("game_state"),
        "status": room["status"],
        "created_at": room["created_at"].isoformat() if isinstance(room["created_at"], datetime) else room["created_at"]
    }

@api_router.post("/rooms/{room_code}/start")
async def start_game(room_code: str):
    """Start the game"""
    room = await db.game_rooms.find_one({"room_code": room_code.upper()})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if len(room["players"]) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players")
    
    if room["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")
    
    # Initialize game state
    game_state = initialize_game_state(room["players"])
    
    await db.game_rooms.update_one(
        {"room_code": room_code.upper()},
        {"$set": {
            "game_state": game_state,
            "players": game_state["players"],
            "status": "playing"
        }}
    )
    
    return {"message": "Game started", "game_state": game_state}

@api_router.post("/rooms/{room_code}/play")
async def play_card(room_code: str, request: PlayCardRequest):
    """Play a card"""
    room = await db.game_rooms.find_one({"room_code": room_code.upper()})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["status"] != "playing":
        raise HTTPException(status_code=400, detail="Game not in progress")
    
    try:
        game_state = play_card_logic(room["game_state"], request.player_id, request.card)
        
        status = "finished" if game_state.get("winner") else "playing"
        
        await db.game_rooms.update_one(
            {"room_code": room_code.upper()},
            {"$set": {
                "game_state": game_state,
                "players": game_state["players"],
                "status": status
            }}
        )
        
        return {"success": True, "game_state": game_state}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/rooms/{room_code}/pass")
async def pass_turn(room_code: str, request: PassTurnRequest):
    """Pass turn"""
    room = await db.game_rooms.find_one({"room_code": room_code.upper()})
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room["status"] != "playing":
        raise HTTPException(status_code=400, detail="Game not in progress")
    
    try:
        game_state = pass_turn_logic(room["game_state"], request.player_id)
        
        await db.game_rooms.update_one(
            {"room_code": room_code.upper()},
            {"$set": {"game_state": game_state}}
        )
        
        return {"success": True, "game_state": game_state}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/rooms/{room_code}/playable/{player_id}")
async def get_playable_cards_endpoint(room_code: str, player_id: str):
    """Get playable cards for a player"""
    room = await db.game_rooms.find_one({"room_code": room_code.upper()})
    
    if not room or not room.get("game_state"):
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = room["game_state"]
    
    # Find player
    player = None
    for p in game_state["players"]:
        if p["id"] == player_id:
            player = p
            break
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    playable = get_playable_cards(game_state["board"], player["hand"])
    
    return {"playable_cards": playable}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
