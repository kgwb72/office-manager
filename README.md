# Office Seat Allocation Application

A web-based application for managing office seating arrangements using 2D and 3D visualizations.

## Features

- 2D and 3D interactive visualizations of office layouts
- User authentication via Azure Entra ID (or local auth for development)
- Manage multiple office locations and floors
- Create and edit office layouts with walls, desks, and chairs
- Assign seats to users and track seat assignment history
- Upload and view SVG floor plans and 360° panorama images
- Department zone management
- Role-based access control

## Technology Stack

### Backend

- .NET Core 8.0
- Entity Framework Core
- SQL Server
- JWT Authentication
- ASP.NET Core Web API

### Frontend

- HTML, CSS, JavaScript (ES6+)
- Fabric.js for 2D canvas manipulation
- Three.js for 3D rendering
- Azure Entra ID for authentication (with mock implementation for development)

## Setup Instructions

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (or SQL Server Express)
- Node.js and npm (optional, for frontend development)

### Backend Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/office-seating-plan.git
   cd office-seating-plan
   ```

2. Update connection string in `src/OfficeSeatingPlan.API/appsettings.json` to point to your SQL Server instance.

3. Apply database migrations:
   ```
   cd src/OfficeSeatingPlan.API
   dotnet ef database update
   ```

4. Run the API:
   ```
   dotnet run
   ```

5. The API will be available at `https://localhost:44317` with Swagger documentation at `https://localhost:44317/swagger`.

### Frontend Setup

1. Navigate to the frontend directory (from the project root):
   ```
   cd frontend
   ```

2. Open `index.html` in a web browser or serve it using a local web server.

   For example, using Python's built-in HTTP server:
   ```
   python -m http.server 3000
   ```

   Or using Node.js http-server:
   ```
   npm install -g http-server
   http-server -p 3000
   ```

3. Access the application at `http://localhost:3000`.

## Configuration

### Authentication

- For development, the application uses a mock authentication service by default.
- To use Azure Entra ID, update the following settings:
  - In `js/app.js`, set `this.config.useMockAuth` to `false`.
  - Update the client ID and authority in `auth-service.js`.

### API Endpoints

- The frontend is configured to connect to `https://localhost:44317/api` by default.
- To change the API URL, update the `apiBaseUrl` property in the configuration section of `app.js`.

### CORS

- CORS is configured in the backend to allow requests from `http://localhost:3000`, `http://localhost:8080`, `http://localhost:5000`, and the production domain.
- If you're hosting the frontend at a different URL, update the `AllowedOrigins` array in `appsettings.json`.

## User Accounts

The application seeds the following users on first run:

- Admin User:
  - Email: admin@example.com
  - Password: Admin@123
  - Role: Admin

- Manager User:
  - Email: manager@example.com
  - Password: Manager@123
  - Role: Manager

- Regular User:
  - Email: user@example.com
  - Password: User@123
  - Role: User

## Project Structure

### Backend

- `OfficeSeatingPlan.API`: ASP.NET Core Web API project
- `OfficeSeatingPlan.Core`: Domain models, interfaces, and DTOs
- `OfficeSeatingPlan.Data`: Data access layer with Entity Framework
- `OfficeSeatingPlan.Services`: Business logic and services

### Frontend

- `index.html`: Main HTML file
- `styles.css`: CSS styles
- `js/`: JavaScript files
  - `app.js`: Main application controller
  - `canvas2d.js`: 2D canvas implementation
  - `canvas3d.js`: 3D canvas implementation
  - `models.js`: Office object models
- `services/`: Service modules
  - `auth-service.js`: Authentication service
  - `server-data-service.js`: API communication
- `managers/`: Feature managers
  - `location-manager.js`: Location and floor management
  - `seat-assignment-manager.js`: Seat assignments
  - `department-zone-manager.js`: Department zones
  - `file-upload-manager.js`: File uploads

## License

This project is licensed under the MIT License - see the LICENSE file for details.
