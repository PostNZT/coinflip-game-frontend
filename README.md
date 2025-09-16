# Coinflip Game Frontend

A real-time multiplayer coinflip game built with Next.js, TypeScript, and TailwindCSS. Features room-based gameplay, WebSocket communication, and responsive design.

## Features

### Core Gameplay
- **Room Creation**: Create rooms with unique 6-character codes
- **Player Choice**: Select heads or tails when creating a room
- **Automatic Assignment**: Second player automatically gets the opposite side
- **Betting System**: Set custom bet amounts ($1-$1000)
- **Real-time Updates**: Live game state synchronization via WebSocket
- **Animated Coin Flip**: Smooth CSS animations for coin flipping
- **Winner Declaration**: Display results and pot distribution

### Technical Features
- **Input Validation**: Comprehensive client-side validation
- **Error Handling**: User-friendly error messages and recovery
- **Security**: Input sanitization and XSS protection
- **Responsive Design**: Works on desktop and mobile devices
- **Auto-reconnection**: Automatic WebSocket reconnection with retry limits
- **Type Safety**: Full TypeScript implementation

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **State Management**: React Hooks
- **Real-time Communication**: WebSocket
- **Package Manager**: pnpm

## Project Structure

```
coinflip-game-frontend/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── GameRoom.tsx       # Game room interface
│   ├── RoomCreation.tsx   # Room creation form
│   └── RoomJoining.tsx    # Room joining form
├── hooks/                 # Custom React hooks
│   └── useWebSocket.ts    # WebSocket management hook
├── types/                 # TypeScript type definitions
│   └── game.ts           # Game-related interfaces
├── utils/                 # Utility functions
│   └── validation.ts     # Input validation helpers
└── [config files]        # Next.js, TypeScript, TailwindCSS configs
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Backend server running on localhost:8080

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd coinflip-game-frontend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Production Build
```bash
pnpm build
pnpm start
```

## Backend Integration

The frontend expects a backend server running on `localhost:8080` with the following endpoints:

### REST API Endpoints
- `POST /api/rooms` - Create a new room
- `POST /api/rooms/:code/join` - Join an existing room

### WebSocket Endpoints
- `ws://localhost:8080/ws/:roomCode` - Real-time game communication

### Expected Message Types
```typescript
// Incoming messages
{
  type: 'room_update' | 'game_start' | 'coin_flip' | 'game_end' | 'error',
  data: any
}

// Outgoing messages
{
  type: 'start_game' | 'flip_coin' | 'ping',
  data: any
}
```

## Code Quality Features

### Input Validation
- Player names: 1-20 characters, no HTML tags
- Room codes: 6 alphanumeric characters
- Bet amounts: $1-$1000 integers only
- Real-time validation feedback

### Error Handling
- Network error recovery
- WebSocket reconnection (up to 5 attempts)
- User-friendly error messages
- Graceful fallbacks

### Security Considerations
- Input sanitization against XSS
- WebSocket message validation
- Room code format validation
- No sensitive data in client state

### Performance
- Optimized re-renders with useCallback
- Efficient WebSocket management
- Minimal bundle size with Next.js optimization
- CSS-only animations

## Configuration

### Environment Variables
Create a `.env.local` file for custom configuration:
```env
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### WebSocket Configuration
Modify `hooks/useWebSocket.ts` to adjust:
- Reconnection delay (default: 3 seconds)
- Max reconnection attempts (default: 5)
- Heartbeat interval (default: 30 seconds)

## Development

### Available Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Adding New Features
1. Define types in `types/game.ts`
2. Add validation in `utils/validation.ts`
3. Create components in `components/`
4. Add hooks in `hooks/` if needed

### Code Style
- Use TypeScript for all files
- Follow JSDoc conventions for documentation
- Implement proper error handling
- Use TailwindCSS for styling
- Prefer functional components with hooks

## Browser Support

- Chrome 80+
- Firefox 74+
- Safari 13+
- Edge 80+

WebSocket support is required for real-time functionality.

## License

This project is licensed under the ISC License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with proper documentation
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Common Issues

**WebSocket connection fails**
- Ensure backend is running on localhost:8080
- Check firewall settings
- Verify WebSocket endpoint availability

**Build errors**
- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check TypeScript errors: `pnpm build`

**Styling issues**
- Verify TailwindCSS configuration
- Check CSS purging settings
- Ensure proper PostCSS setup

### Performance Issues
- Monitor WebSocket connection count
- Check for memory leaks in useEffect hooks
- Verify proper component unmounting