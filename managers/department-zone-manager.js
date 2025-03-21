class DepartmentZoneManager {
    constructor(app) {
        this.app = app;
        this.departments = [
            { id: 'eng', name: 'Engineering', color: '#3498db' },
            { id: 'sales', name: 'Sales', color: '#2ecc71' },
            { id: 'hr', name: 'HR', color: '#e74c3c' },
            { id: 'fin', name: 'Finance', color: '#f39c12' },
            { id: 'design', name: 'Design', color: '#9b59b6' }
        ];
        
        this.zones = [];
        this.activeZone = null;
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Add a button for creating department zones to your UI
        const createZoneBtn = document.getElementById('create-zone');
        if (createZoneBtn) {
            createZoneBtn.addEventListener('click', () => this.startZoneCreation());
        }
    }
    
    startZoneCreation() {
        // Show department selection dialog
        this.showDepartmentSelector();
    }
    
    showDepartmentSelector() {
        // Create a dialog for selecting a department
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.innerHTML = `
            <div class="modal-header">
                <h3>Select Department for Zone</h3>
                <span class="modal-close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="department-list">
                    ${this.departments.map(dept => `
                        <div class="department-item" data-id="${dept.id}">
                            <div class="color-indicator" style="background-color: ${dept.color}"></div>
                            <div class="department-name">${dept.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners
        dialog.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
        
        const departmentItems = dialog.querySelectorAll('.department-item');
        departmentItems.forEach(item => {
            item.addEventListener('click', () => {
                const deptId = item.getAttribute('data-id');
                const department = this.departments.find(d => d.id === deptId);
                
                document.body.removeChild(dialog);
                
                // Start drawing the zone
                if (department) {
                    this.createZone(department);
                }
            });
        });
    }
    
    createZone(department) {
        // Set app state to zone drawing mode
        this.app.activateTool('select');
        
        // Status message
        this.app.showStatusMessage(`Creating zone for ${department.name}. Click to start drawing.`);
        
        // First click to start drawing
        const firstClickHandler = (e) => {
            const pointer = this.app.canvas2d.getPointer(e.e);
            
            // Start a polygon for the zone
            this.activeZone = {
                department: department,
                points: [{ x: pointer.x, y: pointer.y }],
                fabricObject: null
            };
            
            // Create temporary polygon for drawing
            this.updateZonePreview();
            
            // Remove first click handler
            this.app.canvas2d.off('mouse:down', firstClickHandler);
            
            // Set up subsequent click handler
            this.app.canvas2d.on('mouse:down', this.subsequentClickHandler.bind(this));
            
            // Set up mouse move handler for preview
            this.app.canvas2d.on('mouse:move', this.mouseMoveHandler.bind(this));
            
            // Set up double click to finish
            this.app.canvas2d.on('mouse:dblclick', this.finishZoneHandler.bind(this));
        };
        
        // Add first click handler
        this.app.canvas2d.on('mouse:down', firstClickHandler);
    }
    
    subsequentClickHandler(e) {
        if (!this.activeZone) return;
        
        const pointer = this.app.canvas2d.getPointer(e.e);
        
        // Add point to polygon
        this.activeZone.points.push({ x: pointer.x, y: pointer.y });
        
        // Update preview
        this.updateZonePreview();
    }
    
    mouseMoveHandler(e) {
        if (!this.activeZone) return;
        
        const pointer = this.app.canvas2d.getPointer(e.e);
        
        // Update preview with temporary point
        const points = [...this.activeZone.points, { x: pointer.x, y: pointer.y }];
        this.updateZonePreview(points);
    }
    
    finishZoneHandler(e) {
        if (!this.activeZone || this.activeZone.points.length < 3) return;
        
        // Remove temporary polygon
        if (this.activeZone.fabricObject) {
            this.app.canvas2d.remove(this.activeZone.fabricObject);
        }
        
        // Create final polygon
        const points = this.activeZone.points.flatMap(p => [p.x, p.y]);
        const polygon = new fabric.Polygon(points, {
            fill: this.activeZone.department.color,
            opacity: 0.3,
            selectable: true,
            evented: true,
            departmentId: this.activeZone.department.id
        });
        
        // Add to canvas
        this.app.canvas2d.add(polygon);
        this.app.canvas2d.sendToBack(polygon);
        
        // Add to zones array
        this.zones.push({
            id: `zone_${Date.now()}`,
            department: this.activeZone.department,
            points: this.activeZone.points,
            fabricObject: polygon
        });
        
        // Clean up
        this.app.canvas2d.off('mouse:down', this.subsequentClickHandler);
        this.app.canvas2d.off('mouse:move', this.mouseMoveHandler);
        this.app.canvas2d.off('mouse:dblclick', this.finishZoneHandler);
        
        this.activeZone = null;
        
        // Show confirmation
        this.app.showStatusMessage(`Zone created for ${this.activeZone.department.name}.`);
        
        // Switch back to select tool
        this.app.activateTool('select');
    }
    
    updateZonePreview(points = null) {
        // Remove previous preview
        if (this.activeZone.fabricObject) {
            this.app.canvas2d.remove(this.activeZone.fabricObject);
        }
        
        // Use provided points or active zone points
        const usePoints = points || this.activeZone.points;
        
        // Need at least 2 points to draw anything
        if (usePoints.length < 2) return;
        
        // For lines (2 points), draw a line
        if (usePoints.length === 2) {
            this.activeZone.fabricObject = new fabric.Line(
                [usePoints[0].x, usePoints[0].y, usePoints[1].x, usePoints[1].y],
                {
                    stroke: this.activeZone.department.color,
                    strokeWidth: 2,
                    selectable: false,
                    evented: false
                }
            );
        } else {
            // For 3+ points, draw a polygon
            const flatPoints = usePoints.flatMap(p => [p.x, p.y]);
            this.activeZone.fabricObject = new fabric.Polygon(flatPoints, {
                fill: this.activeZone.department.color,
                opacity: 0.3,
                selectable: false,
                evented: false
            });
        }
        
        // Add to canvas and send to back
        this.app.canvas2d.add(this.activeZone.fabricObject);
        this.app.canvas2d.sendToBack(this.activeZone.fabricObject);
    }
    
    // Get zone containing a point
    getZoneAtPoint(x, y) {
        for (const zone of this.zones) {
            if (zone.fabricObject && zone.fabricObject.containsPoint(new fabric.Point(x, y))) {
                return zone;
            }
        }
        return null;
    }
    
    // Get all objects in a zone
    getObjectsInZone(zoneId) {
        const zone = this.zones.find(z => z.id === zoneId);
        if (!zone) return [];
        
        return this.app.objects.filter(obj => {
            const x = obj.position.x;
            const y = obj.position.z; // Remember, z is used for 2D y
            return zone.fabricObject.containsPoint(new fabric.Point(x, y));
        });
    }
    
    // Color objects based on their zone
    colorObjectsByZone() {
        // Reset all objects to default appearance
        this.app.objects.forEach(obj => {
            obj.options.color = obj.type === 'wall' ? '#414141' : '#8B4513';
            obj.updateVisualState();
        });
        
        // Color objects by zone
        this.zones.forEach(zone => {
            const objects = this.getObjectsInZone(zone.id);
            objects.forEach(obj => {
                // Only apply to non-wall objects
                if (obj.type !== 'wall') {
                    obj.options.color = zone.department.color;
                    obj.updateVisualState();
                }
            });
        });
        
        // Render canvas
        this.app.canvas2d.renderAll();
    }
}