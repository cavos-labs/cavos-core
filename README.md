# Cavos Core

A Next.js-based API service for DeFi operations on Starknet, providing wallet management, token operations, and Vesu protocol integration.

## Features

### Wallet Management

- **Account Creation**: Deploy ArgentX accounts on Starknet with gasless transactions
- **Balance Tracking**: Real-time balance queries for BTC and USD tokens
- **Token Operations**: Send, swap, and manage various tokens
- **Secure Storage**: PIN-based encryption for private keys

### Vesu Protocol Integration

- **Position Management**: Create and manage lending positions
- **Pool Analytics**: Real-time APY and utilization data
- **Multi-Asset Support**: BTC and USD position handling
- **Yield Optimization**: Automated yield farming strategies

### Security & Authentication

- **Bearer Token Auth**: Secure API access control
- **CORS Support**: Cross-origin request handling
- **Encrypted Storage**: AES encryption for sensitive data
- **Gasless Transactions**: User-friendly transaction experience

## Architecture

```
cavos-core/
├── app/
│   ├── api/v1/
│   │   ├── wallet/          # Wallet operations
│   │   │   ├── create/      # Account creation
│   │   │   ├── btc/         # Bitcoin operations
│   │   │   └── usd/         # USD operations
│   │   └── vesu/            # Vesu protocol
│   │       ├── pool/        # Pool analytics
│   │       ├── position/    # Position management
│   │       └── positions/   # Position queries
│   ├── lib/                 # Utilities
│   │   ├── authUtils.ts     # Authentication middleware
│   │   └── utils.ts         # Helper functions
│   └── types/               # TypeScript definitions
│       └── vesu.ts          # Vesu protocol types
├── abis/                    # Smart contract ABIs
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Starknet RPC endpoint
- AVNU API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd cavos-core

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Authentication
CAVOS_TOKEN=your_api_token_here
SECRET_TOKEN=your_encryption_secret

# Starknet Configuration
RPC=https://your-starknet-rpc-endpoint

# AVNU Integration
AVNU_API_KEY=your_avnu_api_key

# Admin Configuration
ADMIN_ADDRESS=your_admin_wallet_address
```

### Development

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The API will be available at `http://localhost:3000`

## API Reference

### Authentication

All API endpoints require Bearer token authentication:

```bash
Authorization: Bearer YOUR_CAVOS_TOKEN
```

## Development

### Project Structure

- **`app/api/v1/`**: API routes organized by domain
- **`app/lib/`**: Shared utilities and middleware
- **`app/types/`**: TypeScript type definitions
- **`abis/`**: Smart contract ABIs

### Key Technologies

- **Next.js 15**: React framework with App Router
- **Starknet**: Layer 2 scaling solution
- **AVNU SDK**: Gasless transaction support
- **CryptoJS**: Encryption utilities
- **Axios**: HTTP client

### Code Style

- TypeScript for type safety
- Consistent error handling
- Structured logging
- CORS support for all endpoints

## Security

- All private keys are encrypted with user PINs
- Bearer token authentication required
- CORS headers configured for cross-origin requests
- Input validation on all endpoints
- Secure environment variable management

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Starknet Documentation](https://docs.starknet.io/)
- [AVNU Documentation](https://docs.avnu.fi/)
- [Vesu Protocol](https://vesu.xyz/)
- [Next.js Documentation](https://nextjs.org/docs)

---

Developed by the Cavos Development Team
