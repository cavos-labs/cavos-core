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
│   │       ├── cardWaitlist/      # Card waitlist endpoints
│   │       ├── invitationCode/    # Invitation code endpoints
│   │       ├── transaction/       # Transaction endpoints
│   │       ├── userProfile/       # User profile endpoints
│   │       └── userWallet/        # User wallet endpoints
│   └── lib/
│       └── authUtils.ts           # Authentication utilities
├── package.json
├── tsconfig.json
└── README.md
```

### Endpoints

- `POST /api/v1/cardWaitlist/...` – Card waitlist operations
- `POST /api/v1/invitationCode/...` – Invitation code management
- `POST /api/v1/transaction/...` – Transaction operations
- `POST /api/v1/userProfile/...` – User profile management
- `POST /api/v1/userWallet/...` – User wallet operations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Developed by the Cavos Development Team
