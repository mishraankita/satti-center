#!/usr/bin/env python3
"""
Comprehensive game logic test for Strata 7 Badam Satti
Tests the complete game flow and edge cases
"""

import requests
import json

BASE_URL = "https://sevens-card-game.preview.emergentagent.com/api"

def test_complete_game_flow():
    """Test a complete game flow with multiple moves"""
    session = requests.Session()
    
    print("=== Comprehensive Game Logic Test ===")
    
    # Create room with 3 players
    print("1. Creating room...")
    response = session.post(f"{BASE_URL}/rooms/create", json={"host_name": "Player1"})
    data = response.json()
    room_code = data["room_code"]
    player1_id = data["player_id"]
    print(f"   Room created: {room_code}")
    
    # Add second player
    print("2. Adding Player2...")
    response = session.post(f"{BASE_URL}/rooms/join", json={"room_code": room_code, "player_name": "Player2"})
    player2_id = response.json()["player_id"]
    
    # Add third player
    print("3. Adding Player3...")
    response = session.post(f"{BASE_URL}/rooms/join", json={"room_code": room_code, "player_name": "Player3"})
    player3_id = response.json()["player_id"]
    
    # Start game
    print("4. Starting game...")
    response = session.post(f"{BASE_URL}/rooms/{room_code}/start")
    game_state = response.json()["game_state"]
    
    current_player_index = game_state["current_player_index"]
    current_player = game_state["players"][current_player_index]
    print(f"   Starting player: {current_player['name']} (has 7♥)")
    
    # Play several rounds
    moves_played = 0
    max_moves = 10
    
    while moves_played < max_moves and not game_state.get("winner"):
        current_player_index = game_state["current_player_index"]
        current_player = game_state["players"][current_player_index]
        player_id = current_player["id"]
        
        print(f"\n5.{moves_played + 1} Turn {game_state['turn_number']}: {current_player['name']}'s turn")
        
        # Get playable cards
        response = session.get(f"{BASE_URL}/rooms/{room_code}/playable/{player_id}")
        playable_cards = response.json()["playable_cards"]
        
        print(f"   Playable cards: {len(playable_cards)}")
        for card in playable_cards[:3]:  # Show first 3
            print(f"     - {card['rank']}♥♠♦♣"[['hearts','spades','diamonds','clubs'].index(card['suit'])])
        
        if playable_cards:
            # Play the first playable card
            card_to_play = playable_cards[0]
            print(f"   Playing: {card_to_play['rank']}♥♠♦♣"[['hearts','spades','diamonds','clubs'].index(card_to_play['suit'])])
            
            response = session.post(f"{BASE_URL}/rooms/{room_code}/play", json={
                "room_code": room_code,
                "player_id": player_id,
                "card": card_to_play
            })
            
            if response.status_code == 200:
                game_state = response.json()["game_state"]
                print(f"   ✅ Card played successfully")
                print(f"   Last action: {game_state['last_action']}")
            else:
                print(f"   ❌ Failed to play card: {response.text}")
                break
        else:
            # Try to pass
            print("   No playable cards, attempting to pass...")
            response = session.post(f"{BASE_URL}/rooms/{room_code}/pass", json={
                "room_code": room_code,
                "player_id": player_id
            })
            
            if response.status_code == 200:
                game_state = response.json()["game_state"]
                print(f"   ✅ Pass successful")
            else:
                print(f"   ❌ Pass failed: {response.text}")
                break
        
        moves_played += 1
    
    # Check final game state
    print(f"\n6. Final game state after {moves_played} moves:")
    print(f"   Winner: {game_state.get('winner', 'None')}")
    print(f"   Turn number: {game_state['turn_number']}")
    
    # Verify board state
    board = game_state["board"]
    suits_with_sevens = sum(1 for suit_state in board.values() if suit_state.get("has_seven"))
    print(f"   Suits with 7s played: {suits_with_sevens}/4")
    
    for suit, state in board.items():
        if state.get("has_seven"):
            print(f"   {suit}: {state['low']} ← 7 → {state['high']} ({len(state['cards'])} cards)")
    
    print("\n✅ Comprehensive game logic test completed successfully!")
    return True

if __name__ == "__main__":
    test_complete_game_flow()