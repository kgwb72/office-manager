class ServerDataService {
    constructor() {
        this.apiBaseUrl = 'https://localhost:44317/api';
        this.authToken = null;
    }
    
    setAuthToken(token) {
        this.authToken = token;
    }
    
    async fetchWithAuth(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        try {
            console.log(`Making API request to: ${url}`, options.method || 'GET');
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API error (${response.status}): ${errorText}`);
                throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            if (response.status === 204) { // No Content
                return null;
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    // Buildings/Locations
    async getLocations() {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Buildings`);
    }
    
    async getLocationById(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Buildings/${id}`);
    }
    
    async createLocation(locationData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Buildings`, {
            method: 'POST',
            body: JSON.stringify(locationData)
        });
    }
    
    async updateLocation(id, locationData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Buildings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(locationData)
        });
    }
    
    async deleteLocation(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Buildings/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Layouts (Floors)
    async getLayouts() {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Layouts`);
    }
    
    async getLayoutsByBuilding(buildingId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Layouts/building/${buildingId}`);
    }
    
    async getLayoutById(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Layouts/${id}`);
    }
    
    async createLayout(layoutData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Layouts`, {
            method: 'POST',
            body: JSON.stringify(layoutData)
        });
    }
    
    async updateLayout(id, layoutData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Layouts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(layoutData)
        });
    }
    
    async deleteLayout(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Layouts/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Furniture
    async getFurnitureByLayout(layoutId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Furniture/layout/${layoutId}`);
    }
    
    async createFurniture(furnitureData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Furniture`, {
            method: 'POST',
            body: JSON.stringify(furnitureData)
        });
    }
    
    async updateFurniture(id, furnitureData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Furniture/${id}`, {
            method: 'PUT',
            body: JSON.stringify(furnitureData)
        });
    }
    
    async deleteFurniture(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Furniture/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Walls
    async getWallsByLayout(layoutId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Walls/layout/${layoutId}`);
    }
    
    async createWall(wallData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Walls`, {
            method: 'POST',
            body: JSON.stringify(wallData)
        });
    }
    
    async updateWall(id, wallData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Walls/${id}`, {
            method: 'PUT',
            body: JSON.stringify(wallData)
        });
    }
    
    async deleteWall(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Walls/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Seats
    async getSeatsByLayout(layoutId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Seats/layout/${layoutId}`);
    }
    
    async getSeatById(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Seats/${id}`);
    }
    
    async createSeat(seatData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Seats`, {
            method: 'POST',
            body: JSON.stringify(seatData)
        });
    }
    
    async updateSeat(id, seatData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Seats/${id}`, {
            method: 'PUT',
            body: JSON.stringify(seatData)
        });
    }
    
    async deleteSeat(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Seats/${id}`, {
            method: 'DELETE'
        });
    }
    
    async assignSeat(assignmentData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Seats/assign`, {
            method: 'POST',
            body: JSON.stringify(assignmentData)
        });
    }
    
    async unassignSeat(seatId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Seats/${seatId}/unassign`, {
            method: 'POST'
        });
    }
    
    async getSeatAssignmentHistory(seatId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Seats/${seatId}/history`);
    }
    
    // Users
    async getUsers() {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Users`);
    }
    
    async getUserById(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Users/${id}`);
    }
    
    async updateUser(id, userData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }
    
    async searchUsers(searchTerm, department, hasSeat) {
        let url = `${this.apiBaseUrl}/Users/search?searchTerm=${encodeURIComponent(searchTerm)}`;
        
        if (department) {
            url += `&department=${encodeURIComponent(department)}`;
        }
        
        if (hasSeat !== undefined) {
            url += `&hasSeat=${hasSeat}`;
        }
        
        return this.fetchWithAuth(url);
    }
    
    // Auth
    async login(credentials) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Auth/login`, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }
    
    async register(userData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/Auth/register`, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    // Floors (we'll consider them as layouts with different names)
    async getFloors(buildingId) {
        // We're reusing the layouts endpoints as floors
        return this.getLayoutsByBuilding(buildingId);
    }
    
    // Save layout with layout data
    async saveLayout(floorId, layoutData) {
        // Create a new layout or update existing
        if (layoutData.id) {
            return this.updateLayout(layoutData.id, layoutData);
        } else {
            // For new layouts, ensure they have the building ID
            return this.createLayout({
                ...layoutData,
                buildingId: floorId
            });
        }
    }
}

// Create a singleton instance and expose it to the global window
const serverDataService = new ServerDataService();
console.log('ServerDataService instance created:', serverDataService);
window.serverDataService = serverDataService;