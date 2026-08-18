#!/usr/bin/env python3
"""
Generate comprehensive player database for FC Pack Opening Game.
Prioritizes high OVR for Vietnamese players, especially in GOLDEN DRAGON and ASE seasons.
"""

import json
import random

# Top world players (approximate current ratings, boosted for special cards)
WORLD_PLAYERS = [
    # Superstars
    {"name": "Kylian Mbappé", "nation": "France", "pos": "ST", "club": "Real Madrid", "base_ovr": 91},
    {"name": "Erling Haaland", "nation": "Norway", "pos": "ST", "club": "Manchester City", "base_ovr": 91},
    {"name": "Vinicius Jr", "nation": "Brazil", "pos": "LW", "club": "Real Madrid", "base_ovr": 90},
    {"name": "Jude Bellingham", "nation": "England", "pos": "CAM", "club": "Real Madrid", "base_ovr": 90},
    {"name": "Rodri", "nation": "Spain", "pos": "CDM", "club": "Manchester City", "base_ovr": 91},
    {"name": "Harry Kane", "nation": "England", "pos": "ST", "club": "Bayern Munich", "base_ovr": 90},
    {"name": "Kevin De Bruyne", "nation": "Belgium", "pos": "CM", "club": "Manchester City", "base_ovr": 90},
    {"name": "Mohamed Salah", "nation": "Egypt", "pos": "RW", "club": "Liverpool", "base_ovr": 89},
    {"name": "Virgil van Dijk", "nation": "Netherlands", "pos": "CB", "club": "Liverpool", "base_ovr": 89},
    {"name": "Thibaut Courtois", "nation": "Belgium", "pos": "GK", "club": "Real Madrid", "base_ovr": 89},
    {"name": "Lamine Yamal", "nation": "Spain", "pos": "RW", "club": "Barcelona", "base_ovr": 86},
    {"name": "Pedri", "nation": "Spain", "pos": "CM", "club": "Barcelona", "base_ovr": 87},
    {"name": "Florian Wirtz", "nation": "Germany", "pos": "CAM", "club": "Bayer Leverkusen", "base_ovr": 89},
    {"name": "Jamal Musiala", "nation": "Germany", "pos": "CAM", "club": "Bayern Munich", "base_ovr": 88},
    {"name": "Bukayo Saka", "nation": "England", "pos": "RW", "club": "Arsenal", "base_ovr": 88},
    {"name": "Phil Foden", "nation": "England", "pos": "RW", "club": "Manchester City", "base_ovr": 88},
    {"name": "Federico Valverde", "nation": "Uruguay", "pos": "CM", "club": "Real Madrid", "base_ovr": 88},
    {"name": "Antonio Rüdiger", "nation": "Germany", "pos": "CB", "club": "Real Madrid", "base_ovr": 88},
    {"name": "Ruben Dias", "nation": "Portugal", "pos": "CB", "club": "Manchester City", "base_ovr": 88},
    {"name": "Alisson", "nation": "Brazil", "pos": "GK", "club": "Liverpool", "base_ovr": 89},
    {"name": "Lautaro Martinez", "nation": "Argentina", "pos": "ST", "club": "Inter", "base_ovr": 89},
    {"name": "Martin Ødegaard", "nation": "Norway", "pos": "CAM", "club": "Arsenal", "base_ovr": 89},
    {"name": "Gianluigi Donnarumma", "nation": "Italy", "pos": "GK", "club": "PSG", "base_ovr": 89},
    {"name": "Robert Lewandowski", "nation": "Poland", "pos": "ST", "club": "Barcelona", "base_ovr": 88},
    {"name": "Lionel Messi", "nation": "Argentina", "pos": "RW", "club": "Inter Miami", "base_ovr": 88},
    {"name": "Cristiano Ronaldo", "nation": "Portugal", "pos": "ST", "club": "Al Nassr", "base_ovr": 86},
    {"name": "Neymar Jr", "nation": "Brazil", "pos": "LW", "club": "Santos", "base_ovr": 85},
    {"name": "Son Heung-min", "nation": "South Korea", "pos": "LW", "club": "Tottenham", "base_ovr": 87},
    {"name": "Cole Palmer", "nation": "England", "pos": "CAM", "club": "Chelsea", "base_ovr": 87},
    {"name": "William Saliba", "nation": "France", "pos": "CB", "club": "Arsenal", "base_ovr": 87},
    {"name": "Declan Rice", "nation": "England", "pos": "CDM", "club": "Arsenal", "base_ovr": 87},
    {"name": "Victor Osimhen", "nation": "Nigeria", "pos": "ST", "club": "Galatasaray", "base_ovr": 87},
    {"name": "Rodrygo", "nation": "Brazil", "pos": "RW", "club": "Real Madrid", "base_ovr": 86},
    {"name": "Khvicha Kvaratskhelia", "nation": "Georgia", "pos": "LW", "club": "PSG", "base_ovr": 86},
    {"name": "Antoine Griezmann", "nation": "France", "pos": "ST", "club": "Atletico Madrid", "base_ovr": 88},
    {"name": "Bernardo Silva", "nation": "Portugal", "pos": "CM", "club": "Manchester City", "base_ovr": 88},
    {"name": "Ederson", "nation": "Brazil", "pos": "GK", "club": "Manchester City", "base_ovr": 88},
    {"name": "Jan Oblak", "nation": "Slovenia", "pos": "GK", "club": "Atletico Madrid", "base_ovr": 88},
    {"name": "Bruno Fernandes", "nation": "Portugal", "pos": "CAM", "club": "Manchester United", "base_ovr": 87},
    {"name": "Rafael Leão", "nation": "Portugal", "pos": "LW", "club": "AC Milan", "base_ovr": 86},
    {"name": "Ousmane Dembélé", "nation": "France", "pos": "RW", "club": "PSG", "base_ovr": 86},
    {"name": "Alexander Isak", "nation": "Sweden", "pos": "ST", "club": "Newcastle", "base_ovr": 86},
    {"name": "Trent Alexander-Arnold", "nation": "England", "pos": "RB", "club": "Liverpool", "base_ovr": 86},
    {"name": "João Cancelo", "nation": "Portugal", "pos": "RB", "club": "Al Hilal", "base_ovr": 85},
    {"name": "Achraf Hakimi", "nation": "Morocco", "pos": "RB", "club": "PSG", "base_ovr": 86},
    {"name": "Theo Hernández", "nation": "France", "pos": "LB", "club": "AC Milan", "base_ovr": 86},
    {"name": "Alphonso Davies", "nation": "Canada", "pos": "LB", "club": "Bayern Munich", "base_ovr": 85},
    {"name": "Marquinhos", "nation": "Brazil", "pos": "CB", "club": "PSG", "base_ovr": 87},
    {"name": "Gabriel", "nation": "Brazil", "pos": "CB", "club": "Arsenal", "base_ovr": 86},
    {"name": "Josko Gvardiol", "nation": "Croatia", "pos": "CB", "club": "Manchester City", "base_ovr": 85},
    # South America (GINGA)
    {"name": "Endrick", "nation": "Brazil", "pos": "ST", "club": "Real Madrid", "base_ovr": 80},
    {"name": "Gabriel Martinelli", "nation": "Brazil", "pos": "LW", "club": "Arsenal", "base_ovr": 84},
    {"name": "Casemiro", "nation": "Brazil", "pos": "CDM", "club": "Manchester United", "base_ovr": 84},
    {"name": "Enzo Fernández", "nation": "Argentina", "pos": "CM", "club": "Chelsea", "base_ovr": 84},
    {"name": "Julián Álvarez", "nation": "Argentina", "pos": "ST", "club": "Atletico Madrid", "base_ovr": 86},
    {"name": "Alexis Mac Allister", "nation": "Argentina", "pos": "CM", "club": "Liverpool", "base_ovr": 85},
    {"name": "Luis Díaz", "nation": "Colombia", "pos": "LW", "club": "Liverpool", "base_ovr": 86},
    {"name": "James Rodríguez", "nation": "Colombia", "pos": "CAM", "club": "Rayo Vallecano", "base_ovr": 80},
    {"name": "Darwin Núñez", "nation": "Uruguay", "pos": "ST", "club": "Liverpool", "base_ovr": 83},
    {"name": "Federico Valverde", "nation": "Uruguay", "pos": "CM", "club": "Real Madrid", "base_ovr": 88},
    # Asia
    {"name": "Kaoru Mitoma", "nation": "Japan", "pos": "LW", "club": "Brighton", "base_ovr": 82},
    {"name": "Takefusa Kubo", "nation": "Japan", "pos": "RW", "club": "Real Sociedad", "base_ovr": 82},
    {"name": "Kim Min-jae", "nation": "South Korea", "pos": "CB", "club": "Bayern Munich", "base_ovr": 85},
    {"name": "Lee Kang-in", "nation": "South Korea", "pos": "CAM", "club": "PSG", "base_ovr": 81},
    {"name": "Sardar Azmoun", "nation": "Iran", "pos": "ST", "club": "Shabab Al Ahli", "base_ovr": 78},
    {"name": "Wu Lei", "nation": "China", "pos": "ST", "club": "Shanghai Port", "base_ovr": 76},
    # More mid-tier for variety
    {"name": "Marcus Rashford", "nation": "England", "pos": "LW", "club": "Manchester United", "base_ovr": 82},
    {"name": "Kai Havertz", "nation": "Germany", "pos": "ST", "club": "Arsenal", "base_ovr": 84},
    {"name": "Martinelli", "nation": "Brazil", "pos": "LW", "club": "Arsenal", "base_ovr": 84},
    {"name": "Gavi", "nation": "Spain", "pos": "CM", "club": "Barcelona", "base_ovr": 83},
    {"name": "Frenkie de Jong", "nation": "Netherlands", "pos": "CM", "club": "Barcelona", "base_ovr": 86},
    {"name": "Ilkay Gündogan", "nation": "Germany", "pos": "CM", "club": "Barcelona", "base_ovr": 84},
    {"name": "João Palhinha", "nation": "Portugal", "pos": "CDM", "club": "Bayern Munich", "base_ovr": 84},
    {"name": "Aurélien Tchouaméni", "nation": "France", "pos": "CDM", "club": "Real Madrid", "base_ovr": 85},
    {"name": "Eduardo Camavinga", "nation": "France", "pos": "CM", "club": "Real Madrid", "base_ovr": 84},
    {"name": "Ferland Mendy", "nation": "France", "pos": "LB", "club": "Real Madrid", "base_ovr": 82},
    {"name": "Dani Carvajal", "nation": "Spain", "pos": "RB", "club": "Real Madrid", "base_ovr": 86},
    {"name": "David Alaba", "nation": "Austria", "pos": "CB", "club": "Real Madrid", "base_ovr": 84},
    {"name": "Éder Militão", "nation": "Brazil", "pos": "CB", "club": "Real Madrid", "base_ovr": 85},
    {"name": "Andriy Lunin", "nation": "Ukraine", "pos": "GK", "club": "Real Madrid", "base_ovr": 82},
    # ===== +100 MORE PLAYERS =====
    # Premier League / England
    {"name": "Mohamed Kudus", "nation": "Ghana", "pos": "RW", "club": "West Ham", "base_ovr": 82},
    {"name": "Jarrod Bowen", "nation": "England", "pos": "RW", "club": "West Ham", "base_ovr": 83},
    {"name": "James Maddison", "nation": "England", "pos": "CAM", "club": "Tottenham", "base_ovr": 84},
    {"name": "Son Heung-min", "nation": "South Korea", "pos": "LW", "club": "Tottenham", "base_ovr": 87},
    {"name": "Dominic Solanke", "nation": "England", "pos": "ST", "club": "Tottenham", "base_ovr": 81},
    {"name": "Pedro Porro", "nation": "Spain", "pos": "RB", "club": "Tottenham", "base_ovr": 82},
    {"name": "Cristian Romero", "nation": "Argentina", "pos": "CB", "club": "Tottenham", "base_ovr": 84},
    {"name": "Micky van de Ven", "nation": "Netherlands", "pos": "CB", "club": "Tottenham", "base_ovr": 82},
    {"name": "Yves Bissouma", "nation": "Mali", "pos": "CDM", "club": "Tottenham", "base_ovr": 81},
    {"name": "Kai Havertz", "nation": "Germany", "pos": "ST", "club": "Arsenal", "base_ovr": 84},
    {"name": "Martin Ødegaard", "nation": "Norway", "pos": "CAM", "club": "Arsenal", "base_ovr": 89},
    {"name": "Gabriel Jesus", "nation": "Brazil", "pos": "ST", "club": "Arsenal", "base_ovr": 82},
    {"name": "Leandro Trossard", "nation": "Belgium", "pos": "LW", "club": "Arsenal", "base_ovr": 82},
    {"name": "Oleksandr Zinchenko", "nation": "Ukraine", "pos": "LB", "club": "Arsenal", "base_ovr": 80},
    {"name": "Ben White", "nation": "England", "pos": "RB", "club": "Arsenal", "base_ovr": 82},
    {"name": "Thomas Partey", "nation": "Ghana", "pos": "CDM", "club": "Arsenal", "base_ovr": 82},
    {"name": "Jadon Sancho", "nation": "England", "pos": "LW", "club": "Chelsea", "base_ovr": 81},
    {"name": "Enzo Fernández", "nation": "Argentina", "pos": "CM", "club": "Chelsea", "base_ovr": 84},
    {"name": "Moises Caicedo", "nation": "Ecuador", "pos": "CDM", "club": "Chelsea", "base_ovr": 83},
    {"name": "Nicolas Jackson", "nation": "Senegal", "pos": "ST", "club": "Chelsea", "base_ovr": 80},
    {"name": "Reece James", "nation": "England", "pos": "RB", "club": "Chelsea", "base_ovr": 84},
    {"name": "Levi Colwill", "nation": "England", "pos": "CB", "club": "Chelsea", "base_ovr": 81},
    {"name": "Christopher Nkunku", "nation": "France", "pos": "CAM", "club": "Chelsea", "base_ovr": 83},
    {"name": "Mykhailo Mudryk", "nation": "Ukraine", "pos": "LW", "club": "Chelsea", "base_ovr": 79},
    {"name": "Bruno Guimarães", "nation": "Brazil", "pos": "CM", "club": "Newcastle", "base_ovr": 85},
    {"name": "Anthony Gordon", "nation": "England", "pos": "LW", "club": "Newcastle", "base_ovr": 83},
    {"name": "Sven Botman", "nation": "Netherlands", "pos": "CB", "club": "Newcastle", "base_ovr": 82},
    {"name": "Kieran Trippier", "nation": "England", "pos": "RB", "club": "Newcastle", "base_ovr": 83},
    {"name": "Nick Pope", "nation": "England", "pos": "GK", "club": "Newcastle", "base_ovr": 83},
    {"name": "Alexander Isak", "nation": "Sweden", "pos": "ST", "club": "Newcastle", "base_ovr": 86},
    {"name": "Diogo Jota", "nation": "Portugal", "pos": "ST", "club": "Liverpool", "base_ovr": 84},
    {"name": "Cody Gakpo", "nation": "Netherlands", "pos": "LW", "club": "Liverpool", "base_ovr": 83},
    {"name": "Luis Díaz", "nation": "Colombia", "pos": "LW", "club": "Liverpool", "base_ovr": 86},
    {"name": "Darwin Núñez", "nation": "Uruguay", "pos": "ST", "club": "Liverpool", "base_ovr": 83},
    {"name": "Andrew Robertson", "nation": "Scotland", "pos": "LB", "club": "Liverpool", "base_ovr": 84},
    {"name": "Ibrahima Konaté", "nation": "France", "pos": "CB", "club": "Liverpool", "base_ovr": 84},
    {"name": "Ryan Gravenberch", "nation": "Netherlands", "pos": "CM", "club": "Liverpool", "base_ovr": 81},
    {"name": "Alexis Mac Allister", "nation": "Argentina", "pos": "CM", "club": "Liverpool", "base_ovr": 85},
    {"name": "Dominik Szoboszlai", "nation": "Hungary", "pos": "CM", "club": "Liverpool", "base_ovr": 83},
    {"name": "Alisson Becker", "nation": "Brazil", "pos": "GK", "club": "Liverpool", "base_ovr": 89},
    {"name": "Marcus Rashford", "nation": "England", "pos": "LW", "club": "Manchester United", "base_ovr": 82},
    {"name": "Bruno Fernandes", "nation": "Portugal", "pos": "CAM", "club": "Manchester United", "base_ovr": 87},
    {"name": "Kobbie Mainoo", "nation": "England", "pos": "CM", "club": "Manchester United", "base_ovr": 79},
    {"name": "Alejandro Garnacho", "nation": "Argentina", "pos": "LW", "club": "Manchester United", "base_ovr": 80},
    {"name": "Rasmus Højlund", "nation": "Denmark", "pos": "ST", "club": "Manchester United", "base_ovr": 80},
    {"name": "Lisandro Martínez", "nation": "Argentina", "pos": "CB", "club": "Manchester United", "base_ovr": 84},
    {"name": "André Onana", "nation": "Cameroon", "pos": "GK", "club": "Manchester United", "base_ovr": 83},
    {"name": "Casemiro", "nation": "Brazil", "pos": "CDM", "club": "Manchester United", "base_ovr": 84},
    # La Liga
    {"name": "Robert Lewandowski", "nation": "Poland", "pos": "ST", "club": "Barcelona", "base_ovr": 88},
    {"name": "Raphinha", "nation": "Brazil", "pos": "RW", "club": "Barcelona", "base_ovr": 84},
    {"name": "Frenkie de Jong", "nation": "Netherlands", "pos": "CM", "club": "Barcelona", "base_ovr": 86},
    {"name": "Pedri", "nation": "Spain", "pos": "CM", "club": "Barcelona", "base_ovr": 87},
    {"name": "Gavi", "nation": "Spain", "pos": "CM", "club": "Barcelona", "base_ovr": 83},
    {"name": "Ronald Araújo", "nation": "Uruguay", "pos": "CB", "club": "Barcelona", "base_ovr": 85},
    {"name": "Jules Koundé", "nation": "France", "pos": "CB", "club": "Barcelona", "base_ovr": 85},
    {"name": "Marc-André ter Stegen", "nation": "Germany", "pos": "GK", "club": "Barcelona", "base_ovr": 89},
    {"name": "Lamine Yamal", "nation": "Spain", "pos": "RW", "club": "Barcelona", "base_ovr": 86},
    {"name": "Fermín López", "nation": "Spain", "pos": "CM", "club": "Barcelona", "base_ovr": 78},
    {"name": "Antoine Griezmann", "nation": "France", "pos": "ST", "club": "Atletico Madrid", "base_ovr": 88},
    {"name": "Julián Álvarez", "nation": "Argentina", "pos": "ST", "club": "Atletico Madrid", "base_ovr": 86},
    {"name": "Rodrigo De Paul", "nation": "Argentina", "pos": "CM", "club": "Atletico Madrid", "base_ovr": 83},
    {"name": "José María Giménez", "nation": "Uruguay", "pos": "CB", "club": "Atletico Madrid", "base_ovr": 84},
    {"name": "Jan Oblak", "nation": "Slovenia", "pos": "GK", "club": "Atletico Madrid", "base_ovr": 88},
    {"name": "Koke", "nation": "Spain", "pos": "CM", "club": "Atletico Madrid", "base_ovr": 83},
    {"name": "Álvaro Morata", "nation": "Spain", "pos": "ST", "club": "Atletico Madrid", "base_ovr": 82},
    {"name": "Nico Williams", "nation": "Spain", "pos": "LW", "club": "Athletic Club", "base_ovr": 84},
    {"name": "Unai Simón", "nation": "Spain", "pos": "GK", "club": "Athletic Club", "base_ovr": 84},
    {"name": "Dani Vivian", "nation": "Spain", "pos": "CB", "club": "Athletic Club", "base_ovr": 81},
    {"name": "Isco", "nation": "Spain", "pos": "CAM", "club": "Real Betis", "base_ovr": 82},
    {"name": "Guido Rodríguez", "nation": "Argentina", "pos": "CDM", "club": "Real Betis", "base_ovr": 81},
    # Serie A
    {"name": "Lautaro Martinez", "nation": "Argentina", "pos": "ST", "club": "Inter", "base_ovr": 89},
    {"name": "Nicolò Barella", "nation": "Italy", "pos": "CM", "club": "Inter", "base_ovr": 86},
    {"name": "Alessandro Bastoni", "nation": "Italy", "pos": "CB", "club": "Inter", "base_ovr": 86},
    {"name": "Hakan Çalhanoğlu", "nation": "Turkey", "pos": "CDM", "club": "Inter", "base_ovr": 85},
    {"name": "Marcus Thuram", "nation": "France", "pos": "ST", "club": "Inter", "base_ovr": 84},
    {"name": "Yann Sommer", "nation": "Switzerland", "pos": "GK", "club": "Inter", "base_ovr": 86},
    {"name": "Federico Dimarco", "nation": "Italy", "pos": "LB", "club": "Inter", "base_ovr": 84},
    {"name": "Dusan Vlahovic", "nation": "Serbia", "pos": "ST", "club": "Juventus", "base_ovr": 84},
    {"name": "Federico Chiesa", "nation": "Italy", "pos": "RW", "club": "Juventus", "base_ovr": 83},
    {"name": "Weston McKennie", "nation": "USA", "pos": "CM", "club": "Juventus", "base_ovr": 81},
    {"name": "Bremer", "nation": "Brazil", "pos": "CB", "club": "Juventus", "base_ovr": 85},
    {"name": "Wojciech Szczęsny", "nation": "Poland", "pos": "GK", "club": "Juventus", "base_ovr": 85},
    {"name": "Rafael Leão", "nation": "Portugal", "pos": "LW", "club": "AC Milan", "base_ovr": 86},
    {"name": "Christian Pulisic", "nation": "USA", "pos": "RW", "club": "AC Milan", "base_ovr": 83},
    {"name": "Theo Hernández", "nation": "France", "pos": "LB", "club": "AC Milan", "base_ovr": 86},
    {"name": "Mike Maignan", "nation": "France", "pos": "GK", "club": "AC Milan", "base_ovr": 87},
    {"name": "Fikayo Tomori", "nation": "England", "pos": "CB", "club": "AC Milan", "base_ovr": 83},
    {"name": "Tijjani Reijnders", "nation": "Netherlands", "pos": "CM", "club": "AC Milan", "base_ovr": 82},
    {"name": "Khvicha Kvaratskhelia", "nation": "Georgia", "pos": "LW", "club": "PSG", "base_ovr": 86},
    {"name": "Victor Osimhen", "nation": "Nigeria", "pos": "ST", "club": "Galatasaray", "base_ovr": 87},
    # Bundesliga
    {"name": "Harry Kane", "nation": "England", "pos": "ST", "club": "Bayern Munich", "base_ovr": 90},
    {"name": "Jamal Musiala", "nation": "Germany", "pos": "CAM", "club": "Bayern Munich", "base_ovr": 88},
    {"name": "Leroy Sané", "nation": "Germany", "pos": "RW", "club": "Bayern Munich", "base_ovr": 84},
    {"name": "Joshua Kimmich", "nation": "Germany", "pos": "CDM", "club": "Bayern Munich", "base_ovr": 87},
    {"name": "Alphonso Davies", "nation": "Canada", "pos": "LB", "club": "Bayern Munich", "base_ovr": 85},
    {"name": "Manuel Neuer", "nation": "Germany", "pos": "GK", "club": "Bayern Munich", "base_ovr": 87},
    {"name": "Kim Min-jae", "nation": "South Korea", "pos": "CB", "club": "Bayern Munich", "base_ovr": 85},
    {"name": "Florian Wirtz", "nation": "Germany", "pos": "CAM", "club": "Bayer Leverkusen", "base_ovr": 89},
    {"name": "Granit Xhaka", "nation": "Switzerland", "pos": "CM", "club": "Bayer Leverkusen", "base_ovr": 84},
    {"name": "Jeremie Frimpong", "nation": "Netherlands", "pos": "RB", "club": "Bayer Leverkusen", "base_ovr": 84},
    {"name": "Victor Boniface", "nation": "Nigeria", "pos": "ST", "club": "Bayer Leverkusen", "base_ovr": 82},
    {"name": "Jonathan Tah", "nation": "Germany", "pos": "CB", "club": "Bayer Leverkusen", "base_ovr": 84},
    {"name": "Xavi Simons", "nation": "Netherlands", "pos": "CAM", "club": "RB Leipzig", "base_ovr": 83},
    {"name": "Lois Openda", "nation": "Belgium", "pos": "ST", "club": "RB Leipzig", "base_ovr": 83},
    {"name": "Dani Olmo", "nation": "Spain", "pos": "CAM", "club": "RB Leipzig", "base_ovr": 84},
    {"name": "Benjamin Sesko", "nation": "Slovenia", "pos": "ST", "club": "RB Leipzig", "base_ovr": 80},
    # Ligue 1 / PSG extras
    {"name": "Ousmane Dembélé", "nation": "France", "pos": "RW", "club": "PSG", "base_ovr": 86},
    {"name": "Achraf Hakimi", "nation": "Morocco", "pos": "RB", "club": "PSG", "base_ovr": 86},
    {"name": "Marquinhos", "nation": "Brazil", "pos": "CB", "club": "PSG", "base_ovr": 87},
    {"name": "Gianluigi Donnarumma", "nation": "Italy", "pos": "GK", "club": "PSG", "base_ovr": 89},
    {"name": "Vitinha", "nation": "Portugal", "pos": "CM", "club": "PSG", "base_ovr": 84},
    {"name": "Warren Zaïre-Emery", "nation": "France", "pos": "CM", "club": "PSG", "base_ovr": 81},
    {"name": "Bradley Barcola", "nation": "France", "pos": "LW", "club": "PSG", "base_ovr": 81},
    {"name": "Nuno Mendes", "nation": "Portugal", "pos": "LB", "club": "PSG", "base_ovr": 84},
    # Icons / Legends style high cards
    {"name": "Zinedine Zidane", "nation": "France", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 94},
    {"name": "Pelé", "nation": "Brazil", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 95},
    {"name": "Diego Maradona", "nation": "Argentina", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 95},
    {"name": "Ronaldo Nazário", "nation": "Brazil", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 94},
    {"name": "Ronaldinho", "nation": "Brazil", "pos": "LW", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 93},
    {"name": "Johan Cruyff", "nation": "Netherlands", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 93},
    {"name": "Thierry Henry", "nation": "France", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 92},
    {"name": "Andrea Pirlo", "nation": "Italy", "pos": "CM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Paolo Maldini", "nation": "Italy", "pos": "CB", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 92},
    {"name": "Franco Baresi", "nation": "Italy", "pos": "CB", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Lev Yashin", "nation": "Russia", "pos": "GK", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 92},
    {"name": "Garrincha", "nation": "Brazil", "pos": "RW", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "George Best", "nation": "Northern Ireland", "pos": "RW", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Eusébio", "nation": "Portugal", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Ferenc Puskás", "nation": "Hungary", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    # Asia / ASE extra
    {"name": "Kaoru Mitoma", "nation": "Japan", "pos": "LW", "club": "Brighton", "base_ovr": 82},
    {"name": "Takefusa Kubo", "nation": "Japan", "pos": "RW", "club": "Real Sociedad", "base_ovr": 82},
    {"name": "Wataru Endo", "nation": "Japan", "pos": "CDM", "club": "Liverpool", "base_ovr": 79},
    {"name": "Ao Tanaka", "nation": "Japan", "pos": "CM", "club": "Leeds United", "base_ovr": 76},
    {"name": "Lee Kang-in", "nation": "South Korea", "pos": "CAM", "club": "PSG", "base_ovr": 81},
    {"name": "Hwang Hee-chan", "nation": "South Korea", "pos": "ST", "club": "Wolves", "base_ovr": 79},
    {"name": "Kim Min-jae", "nation": "South Korea", "pos": "CB", "club": "Bayern Munich", "base_ovr": 85},
    {"name": "Son Heung-min", "nation": "South Korea", "pos": "LW", "club": "Tottenham", "base_ovr": 87},
    {"name": "Sardar Azmoun", "nation": "Iran", "pos": "ST", "club": "Shabab Al Ahli", "base_ovr": 78},
    {"name": "Mehdi Taremi", "nation": "Iran", "pos": "ST", "club": "Inter Milan", "base_ovr": 80},
    {"name": "Wu Lei", "nation": "China", "pos": "ST", "club": "Shanghai Port", "base_ovr": 76},
    {"name": "Zhang Yuning", "nation": "China", "pos": "ST", "club": "Beijing Guoan", "base_ovr": 74},
    {"name": "Jackson Irvine", "nation": "Australia", "pos": "CM", "club": "St Pauli", "base_ovr": 76},
    {"name": "Mathew Ryan", "nation": "Australia", "pos": "GK", "club": "Roma", "base_ovr": 77},
    # Africa
    {"name": "Sadio Mané", "nation": "Senegal", "pos": "LW", "club": "Al Nassr", "base_ovr": 84},
    {"name": "Kalidou Koulibaly", "nation": "Senegal", "pos": "CB", "club": "Al Hilal", "base_ovr": 83},
    {"name": "Édouard Mendy", "nation": "Senegal", "pos": "GK", "club": "Al Ahli", "base_ovr": 82},
    {"name": "Riyad Mahrez", "nation": "Algeria", "pos": "RW", "club": "Al Ahli", "base_ovr": 84},
    {"name": "Ismaël Bennacer", "nation": "Algeria", "pos": "CM", "club": "AC Milan", "base_ovr": 82},
    {"name": "Mohamed Salah", "nation": "Egypt", "pos": "RW", "club": "Liverpool", "base_ovr": 89},
    {"name": "André Onana", "nation": "Cameroon", "pos": "GK", "club": "Manchester United", "base_ovr": 83},
    {"name": "Vincent Aboubakar", "nation": "Cameroon", "pos": "ST", "club": "Hatayspor", "base_ovr": 78},
]

# Vietnamese players - BOOSTED OVR priority
VN_PLAYERS = [
    {"name": "Nguyễn Quang Hải", "nation": "Vietnam", "pos": "CAM", "club": "Công An Hà Nội", "base_ovr": 82},
    {"name": "Nguyễn Tiến Linh", "nation": "Vietnam", "pos": "ST", "club": "Becamex Bình Dương", "base_ovr": 80},
    {"name": "Đặng Văn Lâm", "nation": "Vietnam", "pos": "GK", "club": "Ninh Bình", "base_ovr": 79},
    {"name": "Đỗ Duy Mạnh", "nation": "Vietnam", "pos": "CB", "club": "Hà Nội FC", "base_ovr": 78},
    {"name": "Nguyễn Hoàng Đức", "nation": "Vietnam", "pos": "CM", "club": "Ninh Bình", "base_ovr": 81},
    {"name": "Phạm Tuấn Hải", "nation": "Vietnam", "pos": "ST", "club": "Hà Nội FC", "base_ovr": 79},
    {"name": "Nguyễn Văn Toàn", "nation": "Vietnam", "pos": "RW", "club": "Nam Định", "base_ovr": 77},
    {"name": "Quế Ngọc Hải", "nation": "Vietnam", "pos": "CB", "club": "Công An Hà Nội", "base_ovr": 77},
    {"name": "Đoàn Văn Hậu", "nation": "Vietnam", "pos": "LB", "club": "Công An Hà Nội", "base_ovr": 78},
    {"name": "Bùi Tiến Dũng", "nation": "Vietnam", "pos": "CB", "club": "Thể Công Viettel", "base_ovr": 76},
    {"name": "Vũ Văn Thanh", "nation": "Vietnam", "pos": "RB", "club": "Công An Hà Nội", "base_ovr": 76},
    {"name": "Nguyễn Công Phượng", "nation": "Vietnam", "pos": "ST", "club": "HAGL", "base_ovr": 76},
    {"name": "Khuất Văn Khang", "nation": "Vietnam", "pos": "CM", "club": "Thể Công Viettel", "base_ovr": 75},
    {"name": "Nguyễn Đình Bắc", "nation": "Vietnam", "pos": "ST", "club": "Công An Hà Nội", "base_ovr": 74},
    {"name": "Trần Trung Kiên", "nation": "Vietnam", "pos": "GK", "club": "HAGL", "base_ovr": 72},
    {"name": "Nguyễn Văn Quyết", "nation": "Vietnam", "pos": "CAM", "club": "Hà Nội FC", "base_ovr": 78},
    {"name": "Lương Xuân Trường", "nation": "Vietnam", "pos": "CM", "club": "HAGL", "base_ovr": 74},
    {"name": "Nguyễn Thái Sơn", "nation": "Vietnam", "pos": "CM", "club": "Thanh Hóa", "base_ovr": 73},
    {"name": "Phạm Xuân Mạnh", "nation": "Vietnam", "pos": "RB", "club": "Hà Nội FC", "base_ovr": 75},
    {"name": "Nguyễn Thành Chung", "nation": "Vietnam", "pos": "CB", "club": "Hà Nội FC", "base_ovr": 75},
    {"name": "Nguyễn Văn Vĩ", "nation": "Vietnam", "pos": "LB", "club": "Nam Định", "base_ovr": 74},
    {"name": "Trương Tiến Anh", "nation": "Vietnam", "pos": "RB", "club": "Thể Công Viettel", "base_ovr": 73},
    {"name": "Hoàng Đức", "nation": "Vietnam", "pos": "CM", "club": "Ninh Bình", "base_ovr": 80},
    {"name": "Nguyễn Quốc Việt", "nation": "Vietnam", "pos": "ST", "club": "Ninh Bình", "base_ovr": 72},
    {"name": "Lê Văn Thuận", "nation": "Vietnam", "pos": "ST", "club": "Thanh Hóa", "base_ovr": 71},
    {"name": "Nguyễn Văn Việt", "nation": "Vietnam", "pos": "GK", "club": "Thể Công Viettel", "base_ovr": 72},
    {"name": "Cao Pendant Quang Vinh", "nation": "Vietnam", "pos": "CB", "club": "Công An Hà Nội", "base_ovr": 73},
    {"name": "Nguyễn Nhật Minh", "nation": "Vietnam", "pos": "CB", "club": "Hải Phòng", "base_ovr": 72},
    {"name": "Lê Phạm Thành Long", "nation": "Vietnam", "pos": "CM", "club": "Công An Hà Nội", "base_ovr": 73},
    {"name": "Phạm Gia Hưng", "nation": "Vietnam", "pos": "ST", "club": "Ninh Bình", "base_ovr": 71},
]

# Extra ICON legends (retired only)
EXTRA_ICONS = [
    {"name": "Franz Beckenbauer", "nation": "Germany", "pos": "CB", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 93},
    {"name": "Michel Platini", "nation": "France", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 92},
    {"name": "Marco van Basten", "nation": "Netherlands", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 93},
    {"name": "Ruud Gullit", "nation": "Netherlands", "pos": "CM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Roberto Baggio", "nation": "Italy", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Alessandro Del Piero", "nation": "Italy", "pos": "CF", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Francesco Totti", "nation": "Italy", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Gianluigi Buffon", "nation": "Italy", "pos": "GK", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Iker Casillas", "nation": "Spain", "pos": "GK", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Xavi Hernández", "nation": "Spain", "pos": "CM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Andrés Iniesta", "nation": "Spain", "pos": "CM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Carles Puyol", "nation": "Spain", "pos": "CB", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 89},
    {"name": "Roberto Carlos", "nation": "Brazil", "pos": "LB", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Cafu", "nation": "Brazil", "pos": "RB", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 89},
    {"name": "Kaká", "nation": "Brazil", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Rivaldo", "nation": "Brazil", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Romário", "nation": "Brazil", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Zico", "nation": "Brazil", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Steven Gerrard", "nation": "England", "pos": "CM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Frank Lampard", "nation": "England", "pos": "CM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 89},
    {"name": "Paul Scholes", "nation": "England", "pos": "CM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 89},
    {"name": "Ryan Giggs", "nation": "Wales", "pos": "LM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 89},
    {"name": "David Beckham", "nation": "England", "pos": "RM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 89},
    {"name": "Wayne Rooney", "nation": "England", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Eric Cantona", "nation": "France", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Patrick Vieira", "nation": "France", "pos": "CDM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 89},
    {"name": "Oliver Kahn", "nation": "Germany", "pos": "GK", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Lothar Matthäus", "nation": "Germany", "pos": "CDM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 91},
    {"name": "Gerd Müller", "nation": "Germany", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 93},
    {"name": "Philipp Lahm", "nation": "Germany", "pos": "RB", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Bastian Schweinsteiger", "nation": "Germany", "pos": "CM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 89},
    {"name": "Raúl González", "nation": "Spain", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Luis Figo", "nation": "Portugal", "pos": "RW", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Pavel Nedvěd", "nation": "Czech Republic", "pos": "LM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Zlatan Ibrahimović", "nation": "Sweden", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Samuel Eto'o", "nation": "Cameroon", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Didier Drogba", "nation": "Ivory Coast", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 89},
    {"name": "George Weah", "nation": "Liberia", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 90},
    {"name": "Lê Công Vinh", "nation": "Vietnam", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 82},
    {"name": "Phạm Thành Lương", "nation": "Vietnam", "pos": "CM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 80},
    {"name": "Lê Huỳnh Đức", "nation": "Vietnam", "pos": "ST", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 79},
    {"name": "Nguyễn Hồng Sơn", "nation": "Vietnam", "pos": "CAM", "club": "ICON (ĐÃ GIẢI NGHỆ)", "base_ovr": 78},
]

# Merge extra icons into WORLD_PLAYERS
WORLD_PLAYERS = WORLD_PLAYERS + EXTRA_ICONS

# Heroes - huyền thoại "1 mùa" (không phải Icon full career)
HEROES_PLAYERS = [
    {"name": "Dirk Kuyt", "nation": "Netherlands", "pos": "ST", "club": "Heroes", "base_ovr": 86},
    {"name": "Eden Hazard", "nation": "Belgium", "pos": "LW", "club": "Heroes", "base_ovr": 91},
    {"name": "Jaap Stam", "nation": "Netherlands", "pos": "CB", "club": "Heroes", "base_ovr": 88},
    {"name": "Jamie Carragher", "nation": "England", "pos": "CB", "club": "Heroes", "base_ovr": 86},
    {"name": "Alessandro Nesta", "nation": "Italy", "pos": "CB", "club": "Heroes", "base_ovr": 90},
    {"name": "Vincent Kompany", "nation": "Belgium", "pos": "CB", "club": "Heroes", "base_ovr": 88},
    {"name": "Gareth Bale", "nation": "Wales", "pos": "RW", "club": "Heroes", "base_ovr": 89},
    {"name": "Luis Suárez", "nation": "Uruguay", "pos": "ST", "club": "Heroes", "base_ovr": 90},
    {"name": "Fernando Torres", "nation": "Spain", "pos": "ST", "club": "Heroes", "base_ovr": 88},
    {"name": "Juan Mata", "nation": "Spain", "pos": "CAM", "club": "Heroes", "base_ovr": 85},
    {"name": "Yaya Touré", "nation": "Ivory Coast", "pos": "CM", "club": "Heroes", "base_ovr": 88},
    {"name": "Carlos Tevez", "nation": "Argentina", "pos": "ST", "club": "Heroes", "base_ovr": 87},
    {"name": "Wesley Sneijder", "nation": "Netherlands", "pos": "CAM", "club": "Heroes", "base_ovr": 88},
    {"name": "Arjen Robben", "nation": "Netherlands", "pos": "RW", "club": "Heroes", "base_ovr": 90},
    {"name": "Franck Ribéry", "nation": "France", "pos": "LW", "club": "Heroes", "base_ovr": 89},
    {"name": "Petr Čech", "nation": "Czech Republic", "pos": "GK", "club": "Heroes", "base_ovr": 89},
    {"name": "Ashley Cole", "nation": "England", "pos": "LB", "club": "Heroes", "base_ovr": 87},
    {"name": "Rio Ferdinand", "nation": "England", "pos": "CB", "club": "Heroes", "base_ovr": 88},
    {"name": "Nemanja Vidić", "nation": "Serbia", "pos": "CB", "club": "Heroes", "base_ovr": 88},
    {"name": "Patrice Evra", "nation": "France", "pos": "LB", "club": "Heroes", "base_ovr": 86},
    {"name": "Diego Forlán", "nation": "Uruguay", "pos": "ST", "club": "Heroes", "base_ovr": 87},
    {"name": "Dimitar Berbatov", "nation": "Bulgaria", "pos": "ST", "club": "Heroes", "base_ovr": 86},
    {"name": "Robin van Persie", "nation": "Netherlands", "pos": "ST", "club": "Heroes", "base_ovr": 89},
    {"name": "Mesut Özil", "nation": "Germany", "pos": "CAM", "club": "Heroes", "base_ovr": 88},
    {"name": "Santi Cazorla", "nation": "Spain", "pos": "CM", "club": "Heroes", "base_ovr": 86},
    {"name": "Juan Román Riquelme", "nation": "Argentina", "pos": "CAM", "club": "Heroes", "base_ovr": 89},
    {"name": "Pavel Nedvěd", "nation": "Czech Republic", "pos": "LM", "club": "Heroes", "base_ovr": 90},
    {"name": "Claude Makélélé", "nation": "France", "pos": "CDM", "club": "Heroes", "base_ovr": 87},
    {"name": "Gennaro Gattuso", "nation": "Italy", "pos": "CDM", "club": "Heroes", "base_ovr": 86},
    {"name": "Fabio Cannavaro", "nation": "Italy", "pos": "CB", "club": "Heroes", "base_ovr": 89},
]

# Việt Nam All-Star
VN_ALLSTAR = [
    {"name": "Đỗ Hoàng Hên", "nation": "Vietnam", "pos": "ST", "club": "All-Star VN", "base_ovr": 84},
    {"name": "Đỗ Phi Long", "nation": "Vietnam", "pos": "CAM", "club": "All-Star VN", "base_ovr": 82},
    {"name": "Lê Viktor", "nation": "Vietnam", "pos": "CM", "club": "All-Star VN", "base_ovr": 81},
    {"name": "Nguyễn Leley", "nation": "Vietnam", "pos": "RW", "club": "All-Star VN", "base_ovr": 80},
    {"name": "Adou Minh", "nation": "Vietnam", "pos": "CB", "club": "All-Star VN", "base_ovr": 80},
]

SEASONS = [
    "Base",
    "Champions",   # Nhà vô địch 2026 (vd: Tây Ban Nha, Công An Hà Nội)
    "World Cup",
    "TOTY",
    "TOTS",
    "GINGA",
    "EURO",
    "ASE",
    "GOLDEN DRAGON",
    "ICON",
    "Heroes"
]

# Champions 2026 - nations / clubs that get Champions cards
CHAMPIONS_2026_NATIONS = {"Spain"}  # Spain national team champions
CHAMPIONS_2026_CLUBS = {
    "Công An Hà Nội", "Real Madrid", "Manchester City", "Bayern Munich",
    "Inter", "PSG", "Barcelona", "Liverpool", "Arsenal"
}

def clamp_stat(v):
    return max(1, min(125, int(v)))

def generate_stats(base_ovr, pos):
    """Generate PAC SHO PAS DRI DEF PHY (or GK stats). Max 125."""
    ovr = base_ovr
    cap = 125

    if pos == "GK":
        return {
            "DIV": clamp_stat(min(cap, ovr + random.randint(-2, 8))),
            "HAN": clamp_stat(min(cap, ovr + random.randint(-3, 6))),
            "KIC": clamp_stat(min(cap, ovr + random.randint(-5, 5))),
            "REF": clamp_stat(min(cap, ovr + random.randint(-2, 8))),
            "SPD": clamp_stat(min(cap, max(40, ovr - 15 + random.randint(-5, 8)))),
            "POS": clamp_stat(min(cap, ovr + random.randint(-2, 6)))
        }

    pac = clamp_stat(min(cap, max(50, ovr + random.randint(-8, 10))))
    sho = clamp_stat(min(cap, max(40, ovr + random.randint(-10, 8))))
    pas = clamp_stat(min(cap, max(50, ovr + random.randint(-8, 8))))
    dri = clamp_stat(min(cap, max(50, ovr + random.randint(-6, 9))))
    def_ = clamp_stat(min(cap, max(30, ovr + random.randint(-15, 8))))
    phy = clamp_stat(min(cap, max(50, ovr + random.randint(-8, 8))))

    if pos in ["ST", "CF"]:
        sho = clamp_stat(sho + 6)
        pac = clamp_stat(pac + 3)
        def_ = max(30, def_ - 10)
    elif pos in ["LW", "RW", "LM", "RM"]:
        pac = clamp_stat(pac + 6)
        dri = clamp_stat(dri + 4)
        def_ = max(30, def_ - 8)
    elif pos in ["CAM", "CM"]:
        pas = clamp_stat(pas + 5)
        dri = clamp_stat(dri + 3)
    elif pos in ["CDM"]:
        def_ = clamp_stat(def_ + 6)
        phy = clamp_stat(phy + 4)
        sho = max(40, sho - 5)
    elif pos in ["CB"]:
        def_ = clamp_stat(def_ + 10)
        phy = clamp_stat(phy + 6)
        sho = max(30, sho - 15)
        pac = max(40, pac - 5)
    elif pos in ["LB", "RB"]:
        pac = clamp_stat(pac + 4)
        def_ = clamp_stat(def_ + 4)

    return {"PAC": pac, "SHO": sho, "PAS": pas, "DRI": dri, "DEF": def_, "PHY": phy}

def create_player_card(player, season, ovr_boost=0):
    """Create a full player card. Max OVR = 125."""
    ovr = player["base_ovr"] + ovr_boost

    # Vietnamese priority
    if player["nation"] == "Vietnam":
        if season == "GOLDEN DRAGON":
            ovr += random.randint(22, 38)
        elif season == "ASE":
            ovr += random.randint(12, 22)
        elif season == "Champions":
            ovr += random.randint(15, 25)  # Công An Hà Nội / VN champions
        elif season in ["TOTY", "TOTS", "World Cup", "ICON"]:
            ovr += random.randint(8, 16)

    # ICON - chỉ cầu thủ đã giải nghệ, OVR rất cao
    if season == "ICON":
        ovr = max(ovr, player["base_ovr"] + random.randint(20, 35))
        ovr += random.randint(10, 20)

    # Season boosts
    if season == "TOTY":
        ovr += random.randint(8, 16)
    elif season == "TOTS":
        ovr += random.randint(6, 14)
    elif season == "Champions":
        # Only strong boost if nation/club is 2026 champion
        if player["nation"] in CHAMPIONS_2026_NATIONS or player["club"] in CHAMPIONS_2026_CLUBS:
            ovr += random.randint(12, 22)
        else:
            ovr += random.randint(2, 6)
    elif season == "World Cup":
        ovr += random.randint(5, 12)
    elif season == "GINGA" and player["nation"] in ["Brazil", "Argentina", "Uruguay", "Colombia", "Chile"]:
        ovr += random.randint(6, 14)
    elif season == "EURO" and player["nation"] in ["France", "England", "Spain", "Germany", "Portugal", "Netherlands", "Belgium", "Italy", "Croatia"]:
        ovr += random.randint(5, 12)
    elif season == "Heroes":
        ovr += random.randint(10, 20)
    elif season == "ASE" and player["nation"] in ["Japan", "South Korea", "China", "Iran", "Vietnam", "Australia"]:
        ovr += random.randint(4, 10)

    ovr = max(50, min(125, ovr))
    stats = generate_stats(ovr, player["pos"])

    if ovr >= 110:
        rarity = "mythic"
    elif ovr >= 100:
        rarity = "legendary"
    elif ovr >= 90:
        rarity = "epic"
    elif ovr >= 82:
        rarity = "rare"
    else:
        rarity = "common"

    club = "ICON (ĐÃ GIẢI NGHỆ)" if season == "ICON" else player["club"]
    return {
        "id": f"{player['name'].replace(' ', '_').lower()}_{season.lower().replace(' ', '_')}",
        "name": player["name"],
        "nation": player["nation"],
        "pos": player["pos"],
        "club": club,
        "ovr": ovr,
        "season": season,
        "stats": stats,
        "rarity": rarity
    }

def main():
    all_cards = []
    
    # Generate Base cards for everyone
    for p in WORLD_PLAYERS + VN_PLAYERS:
        all_cards.append(create_player_card(p, "Base", 0))
    
    # Champions 2026 - ưu tiên Tây Ban Nha + Công An Hà Nội + các CLB vô địch
    for p in WORLD_PLAYERS + VN_PLAYERS:
        is_champ = (
            p["nation"] in CHAMPIONS_2026_NATIONS or
            p["club"] in CHAMPIONS_2026_CLUBS or
            p["nation"] == "Vietnam"
        )
        if is_champ or random.random() < 0.35:
            all_cards.append(create_player_card(p, "Champions"))

    for season in ["World Cup", "TOTY", "TOTS"]:
        for p in WORLD_PLAYERS:
            if random.random() < 0.95:
                all_cards.append(create_player_card(p, season))
        for p in VN_PLAYERS:
            if random.random() < 0.98:
                all_cards.append(create_player_card(p, season))

    # GINGA
    for p in WORLD_PLAYERS:
        if p["nation"] in ["Brazil", "Argentina", "Uruguay", "Colombia", "Chile", "Peru", "Ecuador", "Paraguay", "Bolivia", "Venezuela"]:
            all_cards.append(create_player_card(p, "GINGA"))

    # EURO
    for p in WORLD_PLAYERS:
        if p["nation"] in ["France", "England", "Spain", "Germany", "Portugal", "Netherlands", "Belgium", "Italy", "Croatia", "Norway", "Poland"] or random.random() < 0.25:
            all_cards.append(create_player_card(p, "EURO"))

    # ASE
    for p in WORLD_PLAYERS:
        if p["nation"] in ["Japan", "South Korea", "China", "Iran", "Australia"] or random.random() < 0.2:
            all_cards.append(create_player_card(p, "ASE"))
    for p in VN_PLAYERS:
        all_cards.append(create_player_card(p, "ASE"))

    # GOLDEN DRAGON
    for p in VN_PLAYERS:
        all_cards.append(create_player_card(p, "GOLDEN DRAGON"))
        if random.random() < 0.5:
            all_cards.append(create_player_card(p, "GOLDEN DRAGON", random.randint(1, 3)))


    # Heroes season
    for p in HEROES_PLAYERS:
        card = create_player_card(p, "Heroes")
        card["club"] = "Heroes"
        all_cards.append(card)
        if random.random() < 0.5:
            card2 = create_player_card(p, "Heroes", random.randint(1, 4))
            card2["club"] = "Heroes"
            all_cards.append(card2)

    # VN All-Star into special seasons
    for p in VN_ALLSTAR:
        all_cards.append(create_player_card(p, "Base"))
        all_cards.append(create_player_card(p, "ASE"))
        all_cards.append(create_player_card(p, "GOLDEN DRAGON"))
        if random.random() < 0.95:
            all_cards.append(create_player_card(p, "Champions"))
        if random.random() < 0.5:
            all_cards.append(create_player_card(p, "TOTY"))
        if random.random() < 0.5:
            all_cards.append(create_player_card(p, "TOTS"))

    # ICON - CHỈ cầu thủ ĐÃ GIẢI NGHỆ (club chứa ICON)
    for p in WORLD_PLAYERS:
        if "ICON" in str(p.get("club", "")) or p.get("club") == "Icon":
            card = create_player_card(p, "ICON")
            card["club"] = "ICON (ĐÃ GIẢI NGHỆ)"
            all_cards.append(card)
            # Thêm bản ICON cao hơn
            if random.random() < 0.6:
                card2 = create_player_card(p, "ICON", random.randint(2, 5))
                card2["club"] = "ICON (ĐÃ GIẢI NGHỆ)"
                all_cards.append(card2)


    # Extra variants for ~3000 cards
    for season in ["TOTY", "TOTS", "Champions", "World Cup", "EURO", "GINGA", "ASE"]:
        for p in WORLD_PLAYERS:
            if random.random() < 0.4:
                all_cards.append(create_player_card(p, season, random.randint(0, 4)))
        for p in VN_PLAYERS + VN_ALLSTAR:
            if random.random() < 0.55:
                all_cards.append(create_player_card(p, season, random.randint(0, 3)))
    for p in HEROES_PLAYERS:
        if random.random() < 0.5:
            c = create_player_card(p, "Heroes", random.randint(1, 5))
            c["club"] = "Heroes"
            all_cards.append(c)

    # Deduplicate
    unique = {}
    for c in all_cards:
        key = c["id"]
        if key not in unique or c["ovr"] > unique[key]["ovr"]:
            unique[key] = c

    final_cards = list(unique.values())
    random.shuffle(final_cards)
    final_cards.sort(key=lambda x: -x["ovr"])

    with open("data/players.json", "w", encoding="utf-8") as f:
        json.dump(final_cards, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(final_cards)} player cards.")
    print(f"Highest OVR: {final_cards[0]['name']} ({final_cards[0]['ovr']}) - {final_cards[0]['season']}")
    print(f"OVR 110+: {len([c for c in final_cards if c['ovr'] >= 110])}")
    print(f"ICON cards: {len([c for c in final_cards if c['season'] == 'ICON'])}")
    print(f"Champions cards: {len([c for c in final_cards if c['season'] == 'Champions'])}")
    vn_high = [c for c in final_cards if c["nation"] == "Vietnam" and c["ovr"] >= 90]
    print(f"Vietnamese 90+: {len(vn_high)}")
    for c in vn_high[:8]:
        print(f"  - {c['name']} {c['ovr']} ({c['season']})")

if __name__ == "__main__":
    main()
