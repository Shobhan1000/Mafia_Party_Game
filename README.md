## Mafia Party Game

A social deduction party game built with Expo / React Native (JavaScript + TypeScript). Players are assigned roles (e.g. Mafia, Detective, Civilian), and the game uses networking (via sockets) for real-time communication between players.

## Project Structure

Here’s how the repository is organized:
```bash
Mafia_Party_Game/
├─ app/                 # Main React Native app code (screens, UI components)
├─ assets/              # Static files (images, icons etc.)
├─ constants/           # Constant definitions (role names, settings etc.)
├─ hooks/               # Custom React hooks
├─ scripts/             # Utilities / helper scripts (e.g. for development setup)
├─ socket.js            # Socket logic for networking
├─ package.json         # Dependencies & scripts
├─ tsconfig.json        # TypeScript configuration
├─ eslint.config.js     # linting / style rules
├─ app.json             # Expo project config
├─ .gitignore
└─ README.md            # This file
```

## Getting Started

Prerequisites
- Node.js & npm (or Yarn)
- Expo CLI globally installed (npm install -g expo-cli)
- Device / simulator for testing (Android, iOS, or Expo Go app)

Setup & Run

Clone the repository:
```bash
git clone https://github.com/Shobhan1000/Mafia_Party_Game.git
cd Mafia_Party_Game
```

Install dependencies:
```bash
npm install
# or
yarn install
```

Start the development server:
```bash
npx expo start
```

Open the app on your device / simulator:

- Via Expo Go
- Or using an Android / iOS emulator

## How to Play

Here’s a typical flow of the game:

- One player acts as Host and starts a game lobby.
- Players join the lobby via the app (or via network).
- Once enough players have joined, the Host starts the game.
- Night Phase: Mafia choose a target; Detective may investigate, etc.
- Day Phase: Players discuss who might be Mafia; voting occurs.
- The player with most votes is eliminated.
- Repeat Night/Day until end condition: Mafia outnumber civilians or all Mafia are eliminated.

# Dependencies / Configuration

- React Native + Expo
- Socket library for real-time events (socket.js)
- TypeScript for type safety
- Linting with ESLint
- Use of constants and hooks to manage state & roles

You may need to configure:

- Socket server (if hosted separately or locally)
- Role settings (how many Mafia, Detective etc.), which can be constants in constants/
- Device permissions if any (camera, notifications) depending on features

## Roadmap / Future Ideas

- More roles (Doctor, Jury, etc.)
- Improved UI / UX (animations, sounds)
- Better error handling / reconnection for sockets
- Score tracking / multiple rounds
- Localization / theme support

## Contributing

Contributions are welcome! Here’s how to help:

- Fork the repo
- Create a new branch for your feature or fix (e.g. feature/role-doctor)
- Make your changes and test thoroughly
- Submit a pull request, with clear description of feature or fix