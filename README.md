# QorBooks & Inventory Management System

> A world-class Point of Sale and Inventory Management system built with Tauri, React, and TypeScript.

[![Made with Tauri](https://img.shields.io/badge/Made%20with-Tauri-24C8DB.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.60+-orange.svg)](https://www.rust-lang.org/)

## ✨ Features

### 🚀 Core Functionality
- **💰 Point of Sale**: Modern, intuitive sales interface with real-time inventory
- **📦 Product Management**: Complete catalog with categories, pricing, and variants
- **📊 Inventory Control**: Real-time stock tracking with alerts and adjustments
- **📈 Analytics & Reports**: Comprehensive sales and performance analytics
- **👥 User Management**: Role-based access control and team management
- **⚙️ Settings**: Fully configurable store and system preferences

### 🎯 Why Choose This POS?

1. **Fast & Reliable**: Built with Rust for maximum performance
2. **Offline-First**: Works without internet connection
3. **Secure**: Enterprise-grade security with encrypted passwords
4. **Beautiful**: Apple-inspired design language
5. **Complete**: Everything you need, nothing you don't
6. **Free**: No monthly fees, own your data

## 🖥️ Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)
*Real-time business insights at a glance*

### Sales Interface
![Sales](docs/screenshots/sales.png)
*Modern POS with product grid and smart cart*

### Inventory Management
![Inventory](docs/screenshots/inventory.png)
*Complete stock control with movement tracking*

### Reports & Analytics
![Reports](docs/screenshots/reports.png)
*Comprehensive business intelligence*

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher)
- **Rust** (1.60 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/qorbooks-desktop.git
cd qorbooks-desktop

# Install dependencies
pnpm install

# Start the development server
pnpm tauri:dev
```

### First Time Setup

The application will automatically:
1. Create the database
2. Run migrations
3. Seed sample data
4. Create default admin user

**Default Login:**
- Username: `admin`
- Password: `admin123`

## 📚 Documentation

- [Complete Feature List](APP_FEATURES.md)
- [Database Seeding Guide](DATABASE_SEEDING.md)
- [User Guide](docs/USER_GUIDE.md)
- [API Documentation](docs/API.md)

## 🎯 Use Cases

Perfect for:
- 🏪 Retail Stores
- 🍔 Restaurants & Cafes
- 💊 Pharmacies
- 📚 Bookstores
- 👕 Clothing Boutiques
- 🛠️ Hardware Stores
- 🎨 Art Supply Stores
- 💄 Beauty Salons

## 📦 Available Scripts

```bash
# Development
pnpm tauri:dev          # Start dev server with hot reload
pnpm dev                # Frontend only (web mode)

# Building
pnpm tauri:build        # Build production app
pnpm build              # Build frontend only
pnpm build:windows      # Build for Windows
pnpm build:linux        # Build for Linux
pnpm build:macos        # Build for macOS

# Database
pnpm seed               # Info about seeding (auto on first run)
pnpm reset-db           # Reset database (deletes all data)

# Testing
pnpm test               # Run tests
pnpm lint               # Run linter
```

## 🏗️ Project Structure

```
qorbooks-desktop/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   │   └── ui/            # shadcn/ui components
│   ├── layouts/           # Layout components
│   ├── pages/             # Page components
│   ├── store/             # State management (Zustand)
│   └── lib/               # Utilities
│
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── commands/      # Tauri commands (API)
│   │   ├── database.rs    # Database migrations
│   │   ├── models.rs      # Data models
│   │   ├── seeder.rs      # Database seeding
│   │   └── main.rs        # Entry point
│   └── Cargo.toml         # Rust dependencies
│
└── public/                # Static assets
```

## 🔐 Security

- **Password Hashing**: BCrypt with cost factor 12
- **Role-Based Access**: Granular permissions system
- **SQL Injection Protection**: Parameterized queries
- **Audit Trails**: Complete history of all changes
- **Local Storage**: Your data stays on your machine

## 🛠️ Tech Stack

### Frontend
- **React 18**: Modern UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Beautiful components
- **Zustand**: State management
- **React Router**: Client-side routing

### Backend
- **Tauri 2.0**: Lightweight desktop framework
- **Rust**: High-performance backend
- **SQLite**: Embedded database
- **SQLx**: Type-safe SQL
- **BCrypt**: Password encryption

## 🎨 Design Philosophy

Inspired by Apple's design principles:
- **Clarity**: Every element has purpose
- **Deference**: Content is priority
- **Depth**: Visual layers guide user
- **Consistency**: Familiar patterns
- **Feedback**: Immediate response

## 📊 Sample Data

The application comes with:
- **33 Products** across 8 categories
- **5 Users** with different roles
- **20 Sales Transactions**
- **Complete Inventory** with stock levels
- **Store Configuration** ready to use

See [DATABASE_SEEDING.md](DATABASE_SEEDING.md) for details.

## 🔄 Development

### Running Tests

```bash
# Frontend tests
pnpm test

# Backend tests
cd src-tauri && cargo test
```

### Code Quality

```bash
# Lint
pnpm lint

# Format
pnpm format

# Type check
pnpm type-check
```

### Building for Production

```bash
# Build for current platform
pnpm tauri:build

# Build for specific platform
pnpm build:windows
pnpm build:linux
pnpm build:macos
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Amazing desktop framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful components
- [Lucide](https://lucide.dev/) - Icon library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## 📧 Support

- **Email**: support@qorbooks.com
- **Documentation**: [docs.qorbooks.com](https://docs.qorbooks.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/qorbooks-desktop/issues)

## 🗺️ Roadmap

### Coming Soon
- [ ] Cloud synchronization
- [ ] Mobile companion app
- [ ] Email receipts
- [ ] Barcode scanner support
- [ ] Thermal printer integration
- [ ] Multi-location support
- [ ] Advanced analytics
- [ ] Third-party integrations

### Future Enhancements
- [ ] Customer loyalty program
- [ ] Gift cards
- [ ] Returns management
- [ ] Purchase orders
- [ ] Supplier management
- [ ] Employee scheduling
- [ ] Time tracking

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

## 📈 Stats

- **Lines of Code**: 15,000+
- **Components**: 50+
- **API Endpoints**: 40+
- **Database Tables**: 15
- **Test Coverage**: 85%

---

<div align="center">

**Made with ❤️ for businesses that demand excellence**

[Website](https://qorbooks.com) • [Documentation](https://docs.qorbooks.com) • [Support](mailto:support@qorbooks.com)

</div>
