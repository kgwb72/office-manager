class ServerDataService {
    constructor() {
        this.apiBaseUrl = '/api';
        this.authToken = null;
    }
    
    setAuthToken(token) {
        this.authToken = token;
    }
    
    async fetchWithAuth(url, options = {}) {
        if (this.authToken) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${this.authToken}`
            };
        }
        
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    // Office locations
    async getLocations() {
        return this.fetchWithAuth(`${this.apiBaseUrl}/locations`);
    }
    
    async createLocation(locationData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/locations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(locationData)
        });
    }
    
    async updateLocation(id, locationData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/locations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(locationData)
        });
    }
    
    async deleteLocation(id) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/locations/${id}`, {
            method: 'DELETE'
        });
    }
    
    // Floors
    async getFloors(locationId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/locations/${locationId}/floors`);
    }
    
    async createFloor(locationId, floorData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/locations/${locationId}/floors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(floorData)
        });
    }
    
    // Layouts
    async getLayouts(floorId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/floors/${floorId}/layouts`);
    }
    
    async saveLayout(floorId, layoutData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/floors/${floorId}/layouts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(layoutData)
        });
    }
    
    // Seat assignments
    async getSeatAssignments(floorId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/floors/${floorId}/assignments`);
    }
    
    async assignSeat(assignmentData) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/assignments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assignmentData)
        });
    }
    
    async removeSeatAssignment(assignmentId) {
        return this.fetchWithAuth(`${this.apiBaseUrl}/assignments/${assignmentId}`, {
            method: 'DELETE'
        });
    }
    
    // Users
    async getUsers(query = '', department = '') {
        let url = `${this.apiBaseUrl}/users`;
        const params = new URLSearchParams();
        
        if (query) params.append('query', query);
        if (department) params.append('department', department);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        return this.fetchWithAuth(url);
    }
}