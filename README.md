
# Didi Frontend

This is the frontend application for the Didi project, built with React. It provides a modern, responsive user interface for restaurant discovery, menu browsing, cart management, and social dining experiences.

## Table of Contents
- [Project Description](#project-description)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Technologies Used](#technologies-used)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Project Description
Didi Frontend is a single-page application (SPA) that allows users to:
- Browse restaurants and cuisines
- View and manage menus
- Add items to cart and checkout
- Participate in social dining events
- Manage user profiles and notifications

The app is designed for both customers and vendors, with dedicated pages and modals for each role.

## Features
- Responsive design for desktop and mobile
- User authentication (login, registration, email verification)
- Restaurant and menu management (for vendors)
- Cart and checkout flow
- Social dining and event participation
- Notifications and user settings
- Modals for CRUD operations and confirmations


## Project Structure
- **src/**: Main source code (components, pages, context, utils, assets)
- **public/**: Static files and HTML templates
- **build/**: Production build output
- **tests/**: End-to-end tests (Playwright)


## Getting Started


### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn


### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd didi_frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```


### Running the App
To start the development server:
```bash
npm start
# or
yarn start
```
The app will be available at `http://localhost:3000` by default.


### Building for Production
To create a production build:
```bash
npm run build
# or
yarn build
```
The output will be in the `build/` directory.


### Running Tests
End-to-end tests are located in `tests/e2e/` and use Playwright.
To run tests:
```bash
npx playwright test
```

## Environment Variables
Create a `.env` file in the root directory to configure environment-specific settings. Common variables include:

```
REACT_APP_API_URL=https://api.example.com
REACT_APP_GOOGLE_ANALYTICS_ID=your-ga-id
```

Refer to `.env.example` if available, or ask the team for required variables.

## Deployment
To deploy the production build:
1. Run the build command:
   ```bash
   npm run build
   ```
2. Deploy the contents of the `build/` directory to your static hosting provider (e.g., Netlify, Vercel, AWS S3, Firebase Hosting).

For custom domains or redirects, update the `public/_redirects` file as needed.

## Technologies Used
- React
- React Router
- Context API
- Playwright (testing)
- CSS Modules / Custom CSS
- [Other libraries as listed in `package.json`]

## Troubleshooting & FAQ

**Q: The app won't start or shows a blank page.**
A: Ensure all dependencies are installed and your Node.js version is compatible. Check the browser console for errors.

**Q: API requests are failing.**
A: Verify the `REACT_APP_API_URL` in your `.env` file is correct and the backend server is running.

**Q: How do I reset the app state?**
A: Clear your browser's local storage and cookies, then refresh the page.

**Q: How do I run only a specific Playwright test?**
A: Use the `-g` flag, e.g., `npx playwright test -g "Cart"`.



## Folder Overview
- `src/components/`: Reusable UI components and modals
- `src/pages/`: Page components (Home, Cart, Accounts, etc.)
- `src/context/`: React context providers
- `src/utils/`: Utility functions
- `src/assets/`: CSS, images, fonts


## Contributing
Pull requests are welcome! Please open an issue first to discuss major changes. For code style and commit conventions, follow the existing patterns in the codebase. Please write clear commit messages and document any new features or changes.


## License
[MIT](LICENSE)

## Contact
For questions, suggestions, or support, please contact the project maintainer or open an issue in the repository.
