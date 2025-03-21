class LocationManager {
    constructor(app) {
        this.app = app;
        this.locations = [];
        this.selectedLocation = null;
        this.selectedFloor = null;
        
        this.initialize();
    }
    
    async initialize() {
        await this.loadLocations();
        this.renderLocationSelector();
    }
    
    async loadLocations() {
        try {
            // If we have a server connection
            if (this.app.serverData) {
                this.locations = await this.app.serverData.getLocations();
            } else {
                // Use mock data for development
                this.locations = [
                    { id: 'loc1', name: 'Headquarters', address: '123 Main St', numFloors: 3 },
                    { id: 'loc2', name: 'Branch Office', address: '456 Park Ave', numFloors: 1 }
                ];
            }
            
            // Auto-select first location if any
            if (this.locations.length > 0) {
                await this.selectLocation(this.locations[0].id);
            }
        } catch (error) {
            console.error('Error loading locations:', error);
        }
    }
    
    async selectLocation(locationId) {
        this.selectedLocation = this.locations.find(loc => loc.id === locationId);
        
        if (this.selectedLocation) {
            // Load floors for this location
            await this.loadFloors(locationId);
            
            // Update UI
            this.updateLocationDisplay();
        }
    }
    
    async loadFloors(locationId) {
        try {
            // If we have a server connection
            if (this.app.serverData) {
                this.floors = await this.app.serverData.getFloors(locationId);
            } else {
                // Use mock data for development
                this.floors = [
                    { id: 'floor1', name: 'Ground Floor', level: 0, locationId },
                    { id: 'floor2', name: 'First Floor', level: 1, locationId },
                    { id: 'floor3', name: 'Second Floor', level: 2, locationId }
                ];
            }
            
            // Auto-select first floor if any
            if (this.floors.length > 0) {
                await this.selectFloor(this.floors[0].id);
            }
            
            // Update floor selector
            this.renderFloorSelector();
        } catch (error) {
            console.error('Error loading floors:', error);
        }
    }
    
    async selectFloor(floorId) {
        this.selectedFloor = this.floors.find(floor => floor.id === floorId);
        
        if (this.selectedFloor) {
            // Load the floor layout
            await this.loadFloorLayout(this.selectedFloor);
            
            // Update UI
            this.updateFloorDisplay();
        }
    }
    
    async loadFloorLayout(floor) {
        try {
            // Clear existing layout
            this.app.canvas2d.clear();
            
            // If we have a server connection
            if (this.app.serverData) {
                // Get the latest layout for this floor
                const layouts = await this.app.serverData.getLayouts(floor.id);
                
                if (layouts && layouts.length > 0) {
                    const latestLayout = layouts[0]; // Assuming layouts are sorted by date
                    await this.loadLayoutData(latestLayout.data);
                }
            } else {
                // Check if we have a saved layout in localStorage
                const savedLayout = localStorage.getItem(`floor_layout_${floor.id}`);
                if (savedLayout) {
                    await this.loadLayoutData(JSON.parse(savedLayout));
                }
            }
        } catch (error) {
            console.error('Error loading floor layout:', error);
        }
    }
    
    async loadLayoutData(layoutData) {
        try {
            // Clear existing objects
            this.app.objects = [];
            
            // Create objects from layout data
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
            
            // Render the canvas
            this.app.canvas2d.renderAll();
        } catch (error) {
            console.error('Error loading layout data:', error);
        }
    }
    
    async saveCurrentLayout() {
        if (!this.selectedFloor) {
            alert('No floor selected');
            return;
        }
        
        try {
            // Prepare layout data
            const layoutData = {
                floorId: this.selectedFloor.id,
                name: `Layout ${new Date().toLocaleString()}`,
                date: new Date().toISOString(),
                objects: this.app.objects.map(obj => obj.toJSON())
            };
            
            // If we have a server connection
            if (this.app.serverData) {
                await this.app.serverData.saveLayout(this.selectedFloor.id, layoutData);
                alert('Layout saved to server');
            } else {
                // Save to localStorage for development
                localStorage.setItem(`floor_layout_${this.selectedFloor.id}`, JSON.stringify(layoutData));
                alert('Layout saved locally');
            }
        } catch (error) {
            console.error('Error saving layout:', error);
            alert('Failed to save layout: ' + error.message);
        }
    }
    
    renderLocationSelector() {
        // Create a location selector dropdown
        // You'll need to add this to your HTML
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
        
        // Add change event
        selector.addEventListener('change', (e) => {
            this.selectLocation(e.target.value);
        });
    }
    
    renderFloorSelector() {
        // Create a floor selector dropdown
        // You'll need to add this to your HTML
        const selector = document.getElementById('floor-selector');
        if (!selector) return;
        
        selector.innerHTML = '';
        
        this.floors.forEach(floor => {
            const option = document.createElement('option');
            option.value = floor.id;
            option.textContent = floor.name;
            selector.appendChild(option);
        });
        
        // Set selected value if applicable
        if (this.selectedFloor) {
            selector.value = this.selectedFloor.id;
        }
        
        // Add change event
        selector.addEventListener('change', (e) => {
            this.selectFloor(e.target.value);
        });
    }
    
    updateLocationDisplay() {
        // Update any UI elements that show location info
        const locationTitle = document.getElementById('location-title');
        if (locationTitle && this.selectedLocation) {
            locationTitle.textContent = this.selectedLocation.name;
        }
    }
    
    updateFloorDisplay() {
        // Update any UI elements that show floor info
        const floorTitle = document.getElementById('floor-title');
        if (floorTitle && this.selectedFloor) {
            floorTitle.textContent = this.selectedFloor.name;
        }
    }
}