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

## Project Structure

```
cavos-core/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── card/
│   │       │   └── waitlist/           # Card waitlist endpoints
│   │       ├── invitation/
│   │       │   └── code/               # Invitation code endpoints
│   │       ├── transaction/            # Transaction endpoints
│   │       ├── user/
│   │       │   ├── profile/            # User profile endpoints
│   │       │   └── wallet/             # User wallet endpoints
│   │       ├── vesu/
│   │       │   ├── pool/
│   │       │   │   └── apy/            # Vesu pool APY analytics
│   │       │   ├── position/
│   │       │   │   ├── btc/
│   │       │   │   │   ├── create/     # Create BTC position
│   │       │   │   │   └── withdraw/   # Withdraw BTC position
│   │       │   │   ├── usd/
│   │       │   │   │   ├── claim/      # Claim USD position
│   │       │   │   │   ├── create/     # Create USD position
│   │       │   │   │   └── withdraw/   # Withdraw USD position
│   │       │   └── positions/          # List all Vesu positions
│   │       └── wallet/
│   │           ├── btc/
│   │           │   └── balance/        # BTC wallet balance
│   │           ├── create/             # Create a new wallet
│   │           └── usd/
│   │               ├── balance/        # USD wallet balance
│   │               ├── send/           # Send USD tokens
│   │               └── swap/           # Swap USD tokens
│   └── lib/
│       └── authUtils.ts                # Authentication utilities
├── package.json
├── tsconfig.json
└── README.md
```

### Endpoints

- `POST /api/v1/card/waitlist` – Card waitlist operations
- `POST /api/v1/invitation/code` – Invitation code management
- `POST /api/v1/transaction` – Transaction operations
- `POST /api/v1/user/profile` – User profile management
- `POST /api/v1/user/wallet` – User wallet operations
- `POST /api/v1/vesu/pool/apy` – Vesu pool APY analytics
- `POST /api/v1/vesu/position/btc/create` – Create BTC position
- `POST /api/v1/vesu/position/btc/withdraw` – Withdraw BTC position
- `POST /api/v1/vesu/position/usd/create` – Create USD position
- `POST /api/v1/vesu/position/usd/withdraw` – Withdraw USD position
- `POST /api/v1/vesu/position/usd/claim` – Claim USD position
- `POST /api/v1/vesu/positions` – List all Vesu positions
- `POST /api/v1/wallet/btc/balance` – BTC wallet balance
- `POST /api/v1/wallet/usd/balance` – USD wallet balance
- `POST /api/v1/wallet/usd/send` – Send USD tokens
- `POST /api/v1/wallet/usd/swap` – Swap USD tokens
- `POST /api/v1/wallet/create` – Create a new wallet

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Developed by the Cavos Development Team
