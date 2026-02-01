#!/usr/bin/env python3
"""
Debug script to investigate the play card issue
"""

import requests
import json

BASE_URL = "https://sevens-card-game.preview.emergentagent.com/api"

def debug_play_card_issue():
    session = requests.Session()
    
    # Create room
    print("Creating room...")
    response = session.post(f"{BASE_URL}/rooms/create", json={"host_name": "DebugHost"})
    data = response.json()
    room_code = data["room_code"]
    host_id = data["player_id"]
    print(f"Room created: {room_code}")
    
    # Join room
    print("Joining room...")
    response = session.post(f"{BASE_URL}/rooms/join", json={"room_code": room_code, "player_name": "DebugPlayer2"})
    data = response.json()
    player2_id = data["player_id"]
    print("Player 2 joined")
    
    # Start game
    print("Starting game...")
    response = session.post(f"{BASE_URL}/rooms/{room_code}/start")
    data = response.json()
    game_state = data["game_state"]
    
    current_player_index = game_state["current_player_index"]
    current_player = game_state["players"][current_player_index]
    print(f"Current player: {current_player['name']} (index {current_player_index})")
    print(f"Player hand: {current_player['hand']}")
    
    # Find 7♥
    seven_hearts = None
    for card in current_player["hand"]:
        if card["rank"] == "7" and card["suit"] == "hearts":
            seven_hearts = card
            break
    
    print(f"7♥ found: {seven_hearts}")
    
    # Play 7♥
    print("Playing 7♥...")
    response = session.post(f"{BASE_URL}/rooms/{room_code}/play", json={
        "room_code": room_code,
        "player_id": current_player["id"],
        "card": seven_hearts
    })
    
    if response.status_code == 200:
        data = response.json()
        game_state = data["game_state"]
        print("7♥ played successfully")
        print(f"Board state: {game_state['board']['hearts']}")
        
        # Get new current player
        current_player_index = game_state["current_player_index"]
        current_player = game_state["players"][current_player_index]
        print(f"New current player: {current_player['name']} (index {current_player_index})")
        print(f"New player hand: {current_player['hand']}")
        
        # Try to play invalid card (9♥)
        print("Trying to play invalid card (9♥)...")
        invalid_card = {"rank": "9", "suit": "hearts"}
        
        # Check if player actually has this card
        has_card = any(card["rank"] == "9" and card["suit"] == "hearts" for card in current_player["hand"])
        print(f"Player has 9♥: {has_card}")
        
        if has_card:
            response = session.post(f"{BASE_URL}/rooms/{room_code}/play", json={
                "room_code": room_code,
                "player_id": current_player["id"],
                "card": invalid_card
            })
            
            print(f"Invalid play response status: {response.status_code}")
            print(f"Invalid play response: {response.text}")
        else:
            print("Player doesn't have 9♥, trying with a card they do have...")
            # Try with first card in hand that's not 6♥ or 8♥
            for card in current_player["hand"]:
                if not ((card["rank"] == "6" and card["suit"] == "hearts") or 
                       (card["rank"] == "8" and card["suit"] == "hearts")):
                    print(f"Trying to play {card['rank']}♥...")
                    response = session.post(f"{BASE_URL}/rooms/{room_code}/play", json={
                        "room_code": room_code,
                        "player_id": current_player["id"],
                        "card": card
                    })
                    print(f"Invalid play response status: {response.status_code}")
                    print(f"Invalid play response: {response.text}")
                    break
    else:
        print(f"Failed to play 7♥: {response.status_code} - {response.text}")

if __name__ == "__main__":
    debug_play_card_issue()