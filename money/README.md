# Money: React + Capacitor app, Laravel API + database

Every transaction and budget is saved in the database through the API. The app needs the server to work.

## 1. Backend (new folder next to this one)
    laravel new money-api && cd money-api
    php artisan install:api
    # copy from this zip's api/ folder, same paths (overwrite routes/api.php):
    #   routes/api.php, app/Models/Transaction.php, app/Http/Controllers/*.php, database/migrations/*.php
    php artisan migrate
    php artisan serve --host=0.0.0.0
Database: SQLite works out of the box. For MySQL, set DB_* in .env and run migrate again.
The first account you register becomes the admin. Admins get "Manage users" in the app (disable, enable, delete).

## 2. App
    cd app && npm install
    npm run dev                      # browser test: Server URL http://localhost:8000
    npx cap add ios                  # first time only
    npm run ios                      # opens Xcode, press Run

## 3. Using localhost from iOS
- Browser (npm run dev): http://localhost:8000 just works.
- iOS Simulator: http://localhost:8000 works after the Info.plist change below.
- Real iPhone: use your computer's Wi-Fi address, e.g. http://192.168.1.20:8000 (same Wi-Fi), plus the Info.plist change.
Add to ios/App/App/Info.plist inside <dict>:
    <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
    <key>NSLocalNetworkUsageDescription</key><string>Connect to your Money server</string>
For production use https.

## API
POST /api/register, /api/login (returns token) | POST /api/logout | GET, PATCH /api/me
GET /api/transactions?month=2026-11, POST, PATCH /{id}, DELETE /{id}
GET /api/budgets, PUT /api/budgets {category, amount}
Admin: GET /api/admin/users, PATCH /api/admin/users/{id} {role, is_active}, DELETE /api/admin/users/{id}
