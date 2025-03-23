class LocationManager {
    constructor(app) {
        this.app = app;
        this.locations = [];
        this.floors = [];
        this.selectedLocation = null;
        this.selectedFloor = null;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // await this.loadLocations();
            this.renderLocationSelector();
            
            // Set up event listeners for location and floor selectors
            const locationSelector = document.getElementById('location-selector');
            const floorSelector = document.getElementById('floor-selector');
            
            if (locationSelector) {
                locationSelector.addEventListener('change', (e) => {
                    this.selectLocation(e.target.value);
                });
            }
            
            if (floorSelector) {
                floorSelector.addEventListener('change', (e) => {
                    this.selectFloor(e.target.value);
                });
            }
        } catch (error) {
            console.error('Error initializing location manager:', error);
            this.showError('Failed to initialize locations. Please try again later.');
        }
    }
    
    async loadLocations() {
        try {
            // If we have a server connection
            if (this.app.serverData) {
                // Show loading indicator
                this.showLoading('Loading locations...');
                
                // Get locations from API
                this.locations = await this.app.serverData.getLocations();
                
                // Hide loading indicator
                this.hideLoading();
                
                // Auto-select first location if any
                if (this.locations.length > 0) {
                    await this.selectLocation(this.locations[0].id);
                } else {
                    console.log('No locations available');
                    this.showInfo('No locations available. Please create a location first.');
                }
            } else {
                // Use mock data for development
                console.log('Using mock location data');
                this.locations = [
                    { id: 1, name: 'Headquarters', address: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA', isActive: true },
                    { id: 2, name: 'Branch Office', address: '456 Park Ave', city: 'Boston', state: 'MA', zipCode: '02101', country: 'USA', isActive: true }
                ];
                
                // Auto-select first location if any
                if (this.locations.length > 0) {
                    await this.selectLocation(this.locations[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading locations:', error);
            this.hideLoading();
            this.showError('Failed to load locations. Please try again later.');
            
            // Use mock data as fallback
            this.locations = [
                { id: 1, name: 'Headquarters', address: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001', country: 'USA', isActive: true },
                { id: 2, name: 'Branch Office', address: '456 Park Ave', city: 'Boston', state: 'MA', zipCode: '02101', country: 'USA', isActive: true }
            ];
        }
    }
    
    async selectLocation(locationId) {
        // Find the location object
        this.selectedLocation = this.locations.find(loc => loc.id == locationId);
        
        if (this.selectedLocation) {
            // Load floors for this location
            await this.loadFloors(locationId);
            
            // Update UI
            this.updateLocationDisplay();
        } else {
            console.error(`Location with ID ${locationId} not found`);
        }
    }
    
    async loadFloors(locationId) {
        try {
            // Clear existing floors
            this.floors = [];
            
            // If we have a server connection
            if (this.app.serverData) {
                // Show loading indicator
                this.showLoading('Loading floors...');
                
                // Get floors using layouts endpoint with building ID
                this.floors = await this.app.serverData.getLayoutsByBuilding(locationId);
                
                // Hide loading indicator
                this.hideLoading();
                
                // Auto-select first floor if any
                if (this.floors.length > 0) {
                    await this.selectFloor(this.floors[0].id);
                } else {
                    console.log('No floors available for this location');
                    this.showInfo('No floors available for this location. Please create a floor first.');
                    
                    // Clear the canvas
                    this.app.canvas2d.clear();
                }
            } else {
                // Use mock data for development
                console.log('Using mock floor data');
                this.floors = [
                    { id: 1, name: 'Ground Floor', floorNumber: 0, buildingId: locationId, buildingName: this.selectedLocation.name, width: 2000, height: 1500, isActive: true },
                    { id: 2, name: 'First Floor', floorNumber: 1, buildingId: locationId, buildingName: this.selectedLocation.name, width: 2000, height: 1500, isActive: true }
                ];
                
                // Auto-select first floor if any
                if (this.floors.length > 0) {
                    await this.selectFloor(this.floors[0].id);
                }
            }
            
            // Update floor selector
            this.renderFloorSelector();
        } catch (error) {
            console.error('Error loading floors:', error);
            this.hideLoading();
            this.showError('Failed to load floors. Please try again later.');
            
            // Use mock data as fallback
            this.floors = [
                { id: 1, name: 'Ground Floor', floorNumber: 0, buildingId: locationId, buildingName: this.selectedLocation.name, width: 2000, height: 1500, isActive: true },
                { id: 2, name: 'First Floor', floorNumber: 1, buildingId: locationId, buildingName: this.selectedLocation.name, width: 2000, height: 1500, isActive: true }
            ];
            
            // Update floor selector
            this.renderFloorSelector();
        }
    }
    
    async selectFloor(floorId) {
        // Find the floor object
        this.selectedFloor = this.floors.find(floor => floor.id == floorId);
        
        if (this.selectedFloor) {
            // Load the floor layout
            await this.loadFloorLayout(this.selectedFloor);
            
            // Update UI
            this.updateFloorDisplay();
        } else {
            console.error(`Floor with ID ${floorId} not found`);
        }
    }
    
    async loadFloorLayout(floor) {
        try {
            // Show loading indicator
            this.showLoading('Loading layout...');
            
            // Clear existing layout
            this.app.canvas2d.clear();
            this.app.objects = [];
            
            // If we have a server connection
            if (this.app.serverData) {
                // Load furniture, walls, and seats for this layout
                await this.loadLayoutElements(floor.id);
            } else {
                // Check if we have a saved layout in localStorage
                const savedLayout = localStorage.getItem(`floor_layout_${floor.id}`);
                if (savedLayout) {
                    await this.loadLayoutData(JSON.parse(savedLayout));
                }
            }
            
            // Hide loading indicator
            this.hideLoading();
        } catch (error) {
            console.error('Error loading floor layout:', error);
            this.hideLoading();
            this.showError('Failed to load floor layout. Please try again later.');
        }
    }
    
    async loadLayoutElements(layoutId) {
        try {
            // Load walls
            const walls = await this.app.serverData.getWallsByLayout(layoutId);
            
            // Load furniture
            const furniture = await this.app.serverData.getFurnitureByLayout(layoutId);
            
            // Load seats
            const seats = await this.app.serverData.getSeatsByLayout(layoutId);
            
            // Create objects from API data
            // First add walls
            for (const wall of walls) {
                const position = { x: wall.startX, y: 0, z: wall.startY };
                const rotation = { x: 0, y: 0, z: 0 };
                const dimensions = {
                    width: Math.sqrt(Math.pow(wall.endX - wall.startX, 2) + Math.pow(wall.endY - wall.startY, 2)),
                    height: 250,
                    depth: wall.thickness || 10
                };
                
                // Calculate angle for rotation
                const angle = Math.atan2(wall.endY - wall.startY, wall.endX - wall.startX);
                rotation.y = angle;
                
                // Create wall object
                const wallObj = new Wall(
                    `wall_${wall.id}`,
                    position,
                    rotation,
                    dimensions,
                    {
                        color: wall.color || '#414141',
                        thickness: wall.thickness || 10
                    }
                );
                
                // Add wall to canvas
                wallObj.createFabricObject(this.app.canvas2d);
                
                // Add to objects array
                this.app.objects.push(wallObj);
            }
            
            // Then add furniture
            for (const item of furniture) {
                const position = { x: item.positionX, y: 0, z: item.positionY };
                const rotation = { x: 0, y: (item.rotation || 0) * Math.PI / 180, z: 0 };
                const options = {
                    width: item.width,
                    height: 75, // Default height
                    depth: item.height, // Height in API is used as depth in 3D
                    color: item.color || '#8B4513'
                };
                
                // Create furniture object based on type
                let furnitureObj;
                
                if (item.type.toLowerCase() === 'desk') {
                    furnitureObj = new Desk(
                        `furniture_${item.id}`,
                        position,
                        rotation,
                        options
                    );
                } else {
                    // Generic furniture - we can extend this later
                    furnitureObj = new Desk(
                        `furniture_${item.id}`,
                        position,
                        rotation,
                        options
                    );
                }
                
                // Add to canvas
                furnitureObj.createFabricObject(this.app.canvas2d);
                
                // Add to objects array
                this.app.objects.push(furnitureObj);
            }
            
            // Finally add seats
            for (const seat of seats) {
                const position = { x: seat.positionX, y: 0, z: seat.positionY };
                const rotation = { x: 0, y: (seat.rotation || 0) * Math.PI / 180, z: 0 };
                
                // Create desk with chair
                const deskWithChair = new DeskWithChair(
                    `seat_${seat.id}`,
                    position,
                    rotation,
                    {
                        width: 160, // Default width
                        height: 75, // Default height
                        depth: 80, // Default depth
                        identifier: seat.identifier
                    }
                );
                
                // Add to canvas
                deskWithChair.createFabricObject(this.app.canvas2d);
                
                // If seat is assigned, set the user
                if (seat.assignedUser) {
                    const user = new User(
                        seat.assignedUser.id,
                        seat.assignedUser.displayName,
                        seat.assignedUser.email,
                        seat.assignedUser.department || 'No Department',
                        seat.assignedUser.photoUrl || ''
                    );
                    
                    deskWithChair.assignUser(user);
                }
                
                // Add to objects array
                this.app.objects.push(deskWithChair);
            }
            
            // Render the canvas
            this.app.canvas2d.renderAll();
        } catch (error) {
            console.error('Error loading layout elements:', error);
            throw error;
        }
    }
    
    async loadLayoutData(layoutData) {
        try {
            // Clear existing objects
            this.app.objects = [];
            
            // Create objects from layout data
            if (layoutData.objects && Array.isArray(layoutData.objects)) {
                layoutData.objects.forEach(obj => {
                    const position = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
                    const rotation = { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z };
                    const options = obj.options || {};
                    
                    // Create the object based on type
                    const officeObject = OfficeObjectFactory.createObject(
                        obj.type, 
                        obj.id, 
                        position, 
                        rotation, 
                        { ...options, dimensions: obj.dimensions }
                    );
                    
                    // Add to canvas
                    if (obj.type === 'wall') {
                        officeObject.createFabricObject(this.app.canvas2d);
                    } else if (obj.type === 'desk' || obj.type === 'deskWithChair') {
                        officeObject.createFabricObject(this.app.canvas2d);
                        
                        // Handle user assignment if applicable
                        if (obj.assignedUser) {
                            // Find user from the user list
                            const user = this.app.users.find(u => u.id === obj.assignedUser);
                            if (user) {
                                officeObject.assignUser(user);
                                user.assignedObject = officeObject;
                            }
                        }
                    }
                    
                    // Store in objects array
                    this.app.objects.push(officeObject);
                });
            }
            
            // Render the canvas
            this.app.canvas2d.renderAll();
        } catch (error) {
            console.error('Error loading layout data:', error);
            throw error;
        }
    }
    
    async saveCurrentLayout() {
        if (!this.selectedFloor) {
            this.showError('No floor selected. Please select a floor first.');
            return;
        }
        
        try {
            // Show loading indicator
            this.showLoading('Saving layout...');
            
            // Prepare layout data
            const layoutData = {
                floorId: this.selectedFloor.id,
                name: `Layout ${new Date().toLocaleString()}`,
                date: new Date().toISOString(),
                objects: this.app.objects.map(obj => obj.toJSON())
            };
            
            // If we have a server connection
            if (this.app.serverData) {
                // Save walls, furniture, and seats separately
                await this.saveLayoutElements(this.selectedFloor.id, layoutData.objects);
                
                // Hide loading indicator
                this.hideLoading();
                this.showSuccess('Layout saved to server successfully');
            } else {
                // Save to localStorage for development
                localStorage.setItem(`floor_layout_${this.selectedFloor.id}`, JSON.stringify(layoutData));
                
                // Hide loading indicator
                this.hideLoading();
                this.showSuccess('Layout saved locally');
            }
        } catch (error) {
            console.error('Error saving layout:', error);
            this.hideLoading();
            this.showError('Failed to save layout: ' + error.message);
        }
    }
    
    async saveLayoutElements(layoutId, objects) {
        try {
            // Group objects by type
            const walls = objects.filter(obj => obj.type === 'wall');
            const furniture = objects.filter(obj => obj.type === 'desk');
            const seats = objects.filter(obj => obj.type === 'deskWithChair');
            
            // For each wall, create or update
            for (const wall of walls) {
                // Extract wall data
                const wallDto = {
                    layoutId: layoutId,
                    startX: wall.position.x,
                    startY: wall.position.z,
                    endX: wall.position.x + wall.dimensions.width * Math.cos(wall.rotation.y),
                    endY: wall.position.z + wall.dimensions.width * Math.sin(wall.rotation.y),
                    thickness: wall.dimensions.depth || 10,
                    color: wall.options.color || '#414141'
                };
                
                // Check if wall exists (by ID) and update, otherwise create
                // This approach assumes wall IDs are prefixed with "wall_" followed by database ID
                const wallIdMatch = wall.id.match(/wall_(\d+)/);
                if (wallIdMatch) {
                    const wallId = parseInt(wallIdMatch[1]);
                    await this.app.serverData.updateWall(wallId, wallDto);
                } else {
                    await this.app.serverData.createWall(wallDto);
                }
            }
            
            // For each furniture item, create or update
            for (const item of furniture) {
                // Extract furniture data
                const furnitureDto = {
                    layoutId: layoutId,
                    type: 'desk',
                    positionX: item.position.x,
                    positionY: item.position.z,
                    width: item.dimensions.width,
                    height: item.dimensions.depth,
                    rotation: item.rotation.y * (180 / Math.PI),
                    color: item.options.color || '#8B4513',
                    properties: {}
                };
                
                // Check if furniture exists (by ID) and update, otherwise create
                const furnitureIdMatch = item.id.match(/furniture_(\d+)/);
                if (furnitureIdMatch) {
                    const furnitureId = parseInt(furnitureIdMatch[1]);
                    await this.app.serverData.updateFurniture(furnitureId, furnitureDto);
                } else {
                    await this.app.serverData.createFurniture(furnitureDto);
                }
            }
            
            // For each seat, create or update
            for (const seat of seats) {
                // Extract seat data
                const seatDto = {
                    layoutId: layoutId,
                    identifier: seat.options.identifier || `Seat ${Date.now()}`,
                    positionX: seat.position.x,
                    positionY: seat.position.z,
                    rotation: seat.rotation.y * (180 / Math.PI),
                    status: seat.assignedUser ? 'Occupied' : 'Available',
                    assignedUserId: seat.assignedUser ? seat.assignedUser.id : null,
                    properties: {}
                };
                
                // Check if seat exists (by ID) and update, otherwise create
                const seatIdMatch = seat.id.match(/seat_(\d+)/);
                if (seatIdMatch) {
                    const seatId = parseInt(seatIdMatch[1]);
                    await this.app.serverData.updateSeat(seatId, seatDto);
                } else {
                    await this.app.serverData.createSeat(seatDto);
                }
            }
        } catch (error) {
            console.error('Error saving layout elements:', error);
            throw error;
        }
    }
    
    renderLocationSelector() {
        const selector = document.getElementById('location-selector');
        if (!selector) return;
        
        selector.innerHTML = '';
        
        this.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = location.name;
            selector.appendChild(option);
        });
        
        // Set selected value if applicable
        if (this.selectedLocation) {
            selector.value = this.selectedLocation.id;
        }
    }
    
    renderFloorSelector() {
        const selector = document.getElementById('floor-selector');
        if (!selector) return;
        
        selector.innerHTML = '';
        
        this.floors.forEach(floor => {
            const option = document.createElement('option');
            option.value = floor.id;
            option.textContent = floor.name || `Floor ${floor.floorNumber}`;
            selector.appendChild(option);
        });
        
        // Set selected value if applicable
        if (this.selectedFloor) {
            selector.value = this.selectedFloor.id;
        }
    }
    
    updateLocationDisplay() {
        const locationTitle = document.getElementById('location-title');
        if (locationTitle && this.selectedLocation) {
            locationTitle.textContent = this.selectedLocation.name;
        }
    }
    
    updateFloorDisplay() {
        const floorTitle = document.getElementById('floor-title');
        if (floorTitle && this.selectedFloor) {
            floorTitle.textContent = this.selectedFloor.name || `Floor ${this.selectedFloor.floorNumber}`;
        }
    }
    
    // Helper functions for loading indicators and notifications
    showLoading(message = 'Loading...') {
        let loader = document.querySelector('.loading-indicator');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'loading-indicator';
            loader.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            `;
            document.body.appendChild(loader);
        } else {
            loader.querySelector('.loading-message').textContent = message;
            loader.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loader = document.querySelector('.loading-indicator');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
    }
    
    showNotification(message, type = 'info') {
        // Simple implementation - in a real app you might use a library like toastr
        let notification = document.querySelector('.notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}