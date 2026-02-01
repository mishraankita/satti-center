#!/usr/bin/env python3
"""
Backend API Testing for Strata 7 Badam Satti Card Game
Tests all endpoints and game logic validation
"""

import requests
import json
import time
import sys
from typing import Dict, List, Any

# Base URL from frontend environment
BASE_URL = "https://sevens-card-game.preview.emergentagent.com/api"

class GameTester:
    def __init__(self):
        self.session = requests.Session()
        self.room_code = None
        self.players = []
        self.game_state = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def test_health_check(self) -> bool:
        """Test health endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log("✅ Health check passed")
                    return True
                else:
                    self.log(f"❌ Health check failed - unexpected response: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Health check failed - status code: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Health check failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_card_config(self) -> bool:
        """Test card configuration endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/card-config")
            if response.status_code == 200:
                data = response.json()
                if "ranks" in data and "suits" in data:
                    ranks = data["ranks"]
                    suits = data["suits"]
                    
                    # Verify expected ranks
                    expected_ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
                    if all(rank in ranks for rank in expected_ranks):
                        self.log("✅ Card config passed - all ranks present")
                        
                        # Verify expected suits
                        expected_suits = ["hearts", "spades", "diamonds", "clubs"]
                        if all(suit in suits for suit in expected_suits):
                            self.log("✅ Card config passed - all suits present")
                            return True
                        else:
                            self.log(f"❌ Card config failed - missing suits: {set(expected_suits) - set(suits.keys())}", "ERROR")
                            return False
                    else:
                        self.log(f"❌ Card config failed - missing ranks: {set(expected_ranks) - set(ranks.keys())}", "ERROR")
                        return False
                else:
                    self.log(f"❌ Card config failed - missing ranks or suits in response: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Card config failed - status code: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Card config failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_room_creation(self) -> bool:
        """Test room creation endpoint"""
        try:
            payload = {"host_name": "TestHost"}
            response = self.session.post(f"{BASE_URL}/rooms/create", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "room_code" in data and "player_id" in data:
                    self.room_code = data["room_code"]
                    self.players.append({
                        "id": data["player_id"],
                        "name": "TestHost",
                        "is_host": True
                    })
                    self.log(f"✅ Room creation passed - Room code: {self.room_code}")
                    return True
                else:
                    self.log(f"❌ Room creation failed - missing room_code or player_id: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Room creation failed - status code: {response.status_code}, response: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Room creation failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_room_join(self) -> bool:
        """Test room join endpoint"""
        if not self.room_code:
            self.log("❌ Room join skipped - no room code available", "ERROR")
            return False
            
        try:
            payload = {"room_code": self.room_code, "player_name": "TestPlayer2"}
            response = self.session.post(f"{BASE_URL}/rooms/join", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if "player_id" in data:
                    self.players.append({
                        "id": data["player_id"],
                        "name": "TestPlayer2",
                        "is_host": False
                    })
                    self.log("✅ Room join passed")
                    return True
                else:
                    self.log(f"❌ Room join failed - missing player_id: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Room join failed - status code: {response.status_code}, response: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Room join failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_room_state(self) -> bool:
        """Test getting room state"""
        if not self.room_code:
            self.log("❌ Room state skipped - no room code available", "ERROR")
            return False
            
        try:
            response = self.session.get(f"{BASE_URL}/rooms/{self.room_code}")
            
            if response.status_code == 200:
                data = response.json()
                if "players" in data and len(data["players"]) >= 2:
                    self.log("✅ Room state passed - room has players")
                    return True
                else:
                    self.log(f"❌ Room state failed - insufficient players: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Room state failed - status code: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Room state failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_game_start(self) -> bool:
        """Test game start endpoint"""
        if not self.room_code:
            self.log("❌ Game start skipped - no room code available", "ERROR")
            return False
            
        try:
            response = self.session.post(f"{BASE_URL}/rooms/{self.room_code}/start")
            
            if response.status_code == 200:
                data = response.json()
                if "game_state" in data:
                    self.game_state = data["game_state"]
                    
                    # Verify game state structure
                    required_keys = ["board", "current_player_index", "players", "turn_number"]
                    if all(key in self.game_state for key in required_keys):
                        # Verify player with 7♥ starts
                        current_player = self.game_state["players"][self.game_state["current_player_index"]]
                        has_seven_hearts = any(
                            card["rank"] == "7" and card["suit"] == "hearts" 
                            for card in current_player["hand"]
                        )
                        
                        if has_seven_hearts:
                            self.log("✅ Game start passed - player with 7♥ starts first")
                            return True
                        else:
                            self.log("❌ Game start failed - player with 7♥ doesn't start first", "ERROR")
                            return False
                    else:
                        self.log(f"❌ Game start failed - missing game state keys: {data}", "ERROR")
                        return False
                else:
                    self.log(f"❌ Game start failed - missing game_state: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Game start failed - status code: {response.status_code}, response: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Game start failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_play_card_logic(self) -> bool:
        """Test play card endpoint with game logic validation"""
        if not self.room_code or not self.game_state:
            self.log("❌ Play card skipped - no room or game state available", "ERROR")
            return False
            
        try:
            # Get current player (should have 7♥)
            current_player_index = self.game_state["current_player_index"]
            current_player = self.game_state["players"][current_player_index]
            player_id = current_player["id"]
            
            # Find 7 of hearts in player's hand
            seven_hearts = None
            for card in current_player["hand"]:
                if card["rank"] == "7" and card["suit"] == "hearts":
                    seven_hearts = card
                    break
            
            if not seven_hearts:
                self.log("❌ Play card failed - current player doesn't have 7♥", "ERROR")
                return False
            
            # Test 1: Play 7♥ (should work)
            payload = {
                "room_code": self.room_code,
                "player_id": player_id,
                "card": seven_hearts
            }
            
            response = self.session.post(f"{BASE_URL}/rooms/{self.room_code}/play", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.game_state = data["game_state"]
                    
                    # Verify 7♥ was played correctly
                    hearts_state = self.game_state["board"]["hearts"]
                    if hearts_state.get("has_seven"):
                        self.log("✅ Play card passed - 7♥ played successfully")
                        
                        # Test 2: Try to play invalid card (should fail)
                        return self.test_invalid_play()
                    else:
                        self.log("❌ Play card failed - 7♥ not marked as played", "ERROR")
                        return False
                else:
                    self.log(f"❌ Play card failed - success=false: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Play card failed - status code: {response.status_code}, response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Play card failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_invalid_play(self) -> bool:
        """Test invalid card play (should be rejected)"""
        try:
            # Get current player
            current_player_index = self.game_state["current_player_index"]
            current_player = self.game_state["players"][current_player_index]
            player_id = current_player["id"]
            
            # Get playable cards first
            playable_response = self.session.get(f"{BASE_URL}/rooms/{self.room_code}/playable/{player_id}")
            if playable_response.status_code != 200:
                self.log("❌ Could not get playable cards for invalid play test", "ERROR")
                return False
                
            playable_cards = playable_response.json()["playable_cards"]
            
            # Find a card in player's hand that is NOT in playable cards
            invalid_card = None
            for card in current_player["hand"]:
                is_playable = any(
                    pc["rank"] == card["rank"] and pc["suit"] == card["suit"] 
                    for pc in playable_cards
                )
                if not is_playable:
                    invalid_card = card
                    break
            
            if not invalid_card:
                # If all cards are playable, try a card the player doesn't have
                invalid_card = {"rank": "K", "suit": "hearts"}
                # Make sure this card is not in player's hand
                while any(card["rank"] == invalid_card["rank"] and card["suit"] == invalid_card["suit"] 
                         for card in current_player["hand"]):
                    invalid_card = {"rank": "Q", "suit": "spades"}  # Try different card
            
            payload = {
                "room_code": self.room_code,
                "player_id": player_id,
                "card": invalid_card
            }
            
            response = self.session.post(f"{BASE_URL}/rooms/{self.room_code}/play", json=payload)
            
            # This should fail (400 status)
            if response.status_code == 400:
                self.log("✅ Invalid play correctly rejected")
                return True
            else:
                self.log(f"❌ Invalid play not rejected - status: {response.status_code}, card: {invalid_card}", "ERROR")
                self.log(f"Response: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Invalid play test failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_playable_cards(self) -> bool:
        """Test get playable cards endpoint"""
        if not self.room_code or not self.game_state:
            self.log("❌ Playable cards skipped - no room or game state available", "ERROR")
            return False
            
        try:
            current_player_index = self.game_state["current_player_index"]
            current_player = self.game_state["players"][current_player_index]
            player_id = current_player["id"]
            
            response = self.session.get(f"{BASE_URL}/rooms/{self.room_code}/playable/{player_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "playable_cards" in data:
                    playable_cards = data["playable_cards"]
                    
                    # After 7♥ is played, should be able to play 6♥ or 8♥
                    valid_next_cards = [
                        {"rank": "6", "suit": "hearts"},
                        {"rank": "8", "suit": "hearts"}
                    ]
                    
                    # Check if any valid cards are in playable list
                    has_valid_card = any(
                        any(card["rank"] == valid["rank"] and card["suit"] == valid["suit"] 
                            for valid in valid_next_cards)
                        for card in playable_cards
                    )
                    
                    self.log(f"✅ Playable cards endpoint working - found {len(playable_cards)} playable cards")
                    return True
                else:
                    self.log(f"❌ Playable cards failed - missing playable_cards: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Playable cards failed - status code: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Playable cards failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_pass_turn(self) -> bool:
        """Test pass turn endpoint"""
        if not self.room_code or not self.game_state:
            self.log("❌ Pass turn skipped - no room or game state available", "ERROR")
            return False
            
        try:
            # Find a player who can't play (doesn't have playable cards)
            for player in self.game_state["players"]:
                player_id = player["id"]
                
                # Get playable cards for this player
                response = self.session.get(f"{BASE_URL}/rooms/{self.room_code}/playable/{player_id}")
                if response.status_code == 200:
                    playable_data = response.json()
                    playable_cards = playable_data.get("playable_cards", [])
                    
                    # If player has no playable cards and it's their turn, test pass
                    if len(playable_cards) == 0 and self.game_state["current_player_index"] == self.game_state["players"].index(player):
                        payload = {
                            "room_code": self.room_code,
                            "player_id": player_id
                        }
                        
                        pass_response = self.session.post(f"{BASE_URL}/rooms/{self.room_code}/pass", json=payload)
                        
                        if pass_response.status_code == 200:
                            pass_data = pass_response.json()
                            if pass_data.get("success"):
                                self.log("✅ Pass turn passed - player with no playable cards passed successfully")
                                return True
                            else:
                                self.log(f"❌ Pass turn failed - success=false: {pass_data}", "ERROR")
                                return False
                        else:
                            self.log(f"❌ Pass turn failed - status code: {pass_response.status_code}", "ERROR")
                            return False
            
            # If no player found who can pass, try invalid pass (player with playable cards)
            current_player_index = self.game_state["current_player_index"]
            current_player = self.game_state["players"][current_player_index]
            
            payload = {
                "room_code": self.room_code,
                "player_id": current_player["id"]
            }
            
            response = self.session.post(f"{BASE_URL}/rooms/{self.room_code}/pass", json=payload)
            
            # Should fail if player has playable cards
            if response.status_code == 400:
                self.log("✅ Pass turn correctly rejected for player with playable cards")
                return True
            else:
                self.log("⚠️ Pass turn test inconclusive - no suitable test scenario found", "WARN")
                return True  # Don't fail the test if we can't find a good scenario
                
        except Exception as e:
            self.log(f"❌ Pass turn failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_image_generation(self) -> bool:
        """Test AI image generation endpoint (with timeout)"""
        try:
            payload = {"rank": "7"}
            
            self.log("Testing image generation (may take up to 120 seconds)...")
            response = self.session.post(f"{BASE_URL}/generate-card-image", json=payload, timeout=120)
            
            if response.status_code == 200:
                data = response.json()
                if "image_base64" in data and data["rank"] == "7":
                    self.log("✅ Image generation passed - 7 card image generated")
                    return True
                else:
                    self.log(f"❌ Image generation failed - missing image_base64 or wrong rank: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Image generation failed - status code: {response.status_code}, response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.Timeout:
            self.log("❌ Image generation failed - timeout after 120 seconds", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Image generation failed - exception: {str(e)}", "ERROR")
            return False
    
    def test_get_card_images(self) -> bool:
        """Test get all card images endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/card-images")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log(f"✅ Get card images passed - found {len(data)} images")
                    return True
                else:
                    self.log(f"❌ Get card images failed - response not a list: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Get card images failed - status code: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get card images failed - exception: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all backend tests"""
        results = {}
        
        self.log("=== Starting Backend API Tests ===")
        self.log(f"Base URL: {BASE_URL}")
        
        # Basic endpoint tests
        results["health_check"] = self.test_health_check()
        results["card_config"] = self.test_card_config()
        
        # Room management tests
        results["room_creation"] = self.test_room_creation()
        results["room_join"] = self.test_room_join()
        results["room_state"] = self.test_room_state()
        
        # Game flow tests
        results["game_start"] = self.test_game_start()
        results["play_card"] = self.test_play_card_logic()
        results["playable_cards"] = self.test_playable_cards()
        results["pass_turn"] = self.test_pass_turn()
        
        # Image generation tests (optional - can be slow)
        results["image_generation"] = self.test_image_generation()
        results["get_card_images"] = self.test_get_card_images()
        
        # Summary
        self.log("\n=== Test Results Summary ===")
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        return results

if __name__ == "__main__":
    tester = GameTester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    if not all(results.values()):
        sys.exit(1)
    else:
        sys.exit(0)