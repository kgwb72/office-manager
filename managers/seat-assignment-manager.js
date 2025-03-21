class SeatAssignmentManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Set up search functionality
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        searchInput.addEventListener('input', () => this.handleSearch(searchInput.value));
        
        // Add event listener for desk/chair selection
        this.app.canvas2d.on('selection:created', (e) => this.handleObjectSelection(e));
        this.app.canvas2d.on('selection:updated', (e) => this.handleObjectSelection(e));
    }
    
    handleSearch(query) {
        if (!query || query.length < 2) {
            document.getElementById('search-results').innerHTML = '';
            document.getElementById('search-results').classList.remove('active');
            return;
        }
        
        // Filter users based on query
        const filteredUsers = this.app.users.filter(user => {
            return user.name.toLowerCase().includes(query.toLowerCase()) || 
                   user.id.toLowerCase().includes(query.toLowerCase()) ||
                   user.email.toLowerCase().includes(query.toLowerCase());
        });
        
        // Display results
        this.displaySearchResults(filteredUsers);
    }
    
    displaySearchResults(users) {
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = '';
        
        if (users.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No users found</div>';
            searchResults.classList.add('active');
            return;
        }
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'search-result-item';
            userItem.innerHTML = `
                <div class="user-name">${user.name}</div>
                <div class="user-details">${user.email} - ${user.department}</div>
            `;
            
            // Add click event to select this user
            userItem.addEventListener('click', () => this.selectUser(user));
            
            searchResults.appendChild(userItem);
        });
        
        searchResults.classList.add('active');
    }
    
    selectUser(user) {
        this.selectedUser = user;
        
        // Update properties panel to show selected user
        this.updatePropertiesPanel();
        
        // If a desk is already selected, offer to assign the user
        if (this.selectedDesk) {
            this.promptAssignUser(user, this.selectedDesk);
        }
    }
    
    handleObjectSelection(e) {
        const selectedObject = e.selected[0];
        
        if (selectedObject && selectedObject.officeObject && 
            (selectedObject.officeObject.type === 'desk' || selectedObject.officeObject.type === 'deskWithChair')) {
            
            this.selectedDesk = selectedObject.officeObject;
            
            // Update properties panel
            this.updatePropertiesPanel();
            
            // If a user is already selected, offer to assign them
            if (this.selectedUser) {
                this.promptAssignUser(this.selectedUser, this.selectedDesk);
            }
        } else {
            this.selectedDesk = null;
        }
    }
    
    updatePropertiesPanel() {
        const propertiesPanel = document.getElementById('object-properties');
        propertiesPanel.innerHTML = '';
        
        // Show desk information if selected
        if (this.selectedDesk) {
            const deskInfo = document.createElement('div');
            deskInfo.innerHTML = `
                <h4>Selected Desk</h4>
                <p>ID: ${this.selectedDesk.id}</p>
                <p>Type: ${this.selectedDesk.type}</p>
                <p>Position: X:${Math.round(this.selectedDesk.position.x)}, Y:${Math.round(this.selectedDesk.position.z)}</p>
                <p>Rotation: ${Math.round(this.selectedDesk.rotation.y * (180/Math.PI))}°</p>
            `;
            
            // Show assigned user if any
            if (this.selectedDesk.assignedUser) {
                const user = this.selectedDesk.assignedUser;
                deskInfo.innerHTML += `
                    <h4>Assigned To</h4>
                    <div class="assigned-user">
                        <div class="user-photo-container">
                            <img src="${user.photoUrl}" alt="${user.name}" class="user-photo">
                        </div>
                        <div class="user-info">
                            <p>${user.name}</p>
                            <p>${user.email}</p>
                            <p>${user.department}</p>
                        </div>
                    </div>
                    <button id="remove-assignment" class="tool-btn">Remove Assignment</button>
                `;
                
                propertiesPanel.appendChild(deskInfo);
                
                // Add event listener for removing assignment
                setTimeout(() => {
                    document.getElementById('remove-assignment')?.addEventListener('click', () => {
                        this.removeAssignment(this.selectedDesk);
                    });
                }, 0);
            } else {
                deskInfo.innerHTML += `
                    <p>No user assigned</p>
                    <button id="show-user-list" class="tool-btn">Assign User</button>
                `;
                
                propertiesPanel.appendChild(deskInfo);
                
                // Add event listener for showing user list
                setTimeout(() => {
                    document.getElementById('show-user-list')?.addEventListener('click', () => {
                        this.showUserAssignmentModal();
                    });
                }, 0);
            }
        }
        
        // Show selected user information if any
        if (this.selectedUser) {
            const userInfo = document.createElement('div');
            userInfo.innerHTML = `
                <h4>Selected User</h4>
                <div class="user-info">
                    <div class="user-photo-container">
                        <img src="${this.selectedUser.photoUrl}" alt="${this.selectedUser.name}" class="user-photo">
                    </div>
                    <div>
                        <p>${this.selectedUser.name}</p>
                        <p>${this.selectedUser.email}</p>
                        <p>${this.selectedUser.department}</p>
                    </div>
                </div>
                <button id="clear-user-selection" class="tool-btn">Clear Selection</button>
            `;
            
            propertiesPanel.appendChild(userInfo);
            
            // Add event listener for clearing user selection
            setTimeout(() => {
                document.getElementById('clear-user-selection')?.addEventListener('click', () => {
                    this.selectedUser = null;
                    this.updatePropertiesPanel();
                });
            }, 0);
        }
    }
    
    promptAssignUser(user, desk) {
        // Simple confirmation
        if (confirm(`Do you want to assign ${user.name} to this desk?`)) {
            this.assignUser(user, desk);
        }
    }
    
    assignUser(user, desk) {
        // Remove any previous assignment
        if (user.assignedObject) {
            user.assignedObject.assignedUser = null;
            user.assignedObject.updateVisualState();
        }
        
        if (desk.assignedUser) {
            desk.assignedUser.assignedObject = null;
        }
        
        // Create new assignment
        desk.assignUser(user);
        user.assignedObject = desk;
        
        // Update UI
        this.updatePropertiesPanel();
        this.app.canvas2d.renderAll();
    }
    
    removeAssignment(desk) {
        if (desk.assignedUser) {
            desk.assignedUser.assignedObject = null;
            desk.assignedUser = null;
            desk.updateVisualState();
            
            // Update UI
            this.updatePropertiesPanel();
            this.app.canvas2d.renderAll();
        }
    }
    
    showUserAssignmentModal() {
        // Create a modal for user selection
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Assign User to Desk</h3>
                <span class="modal-close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="modal-search">
                    <input type="text" id="modal-search-input" placeholder="Search users...">
                    <select id="department-filter">
                        <option value="">All Departments</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Sales">Sales</option>
                        <option value="Marketing">Marketing</option>
                        <option value="HR">HR</option>
                        <option value="Finance">Finance</option>
                    </select>
                </div>
                <div id="modal-user-list" class="modal-user-list">
                    <!-- Users will be populated here -->
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set up event listeners
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        const searchInput = modal.querySelector('#modal-search-input');
        const departmentFilter = modal.querySelector('#department-filter');
        const userList = modal.querySelector('#modal-user-list');
        
        // Populate user list
        this.populateUserList(userList, '', '');
        
        // Add search and filter functionality
        searchInput.addEventListener('input', () => {
            this.populateUserList(userList, searchInput.value, departmentFilter.value);
        });
        
        departmentFilter.addEventListener('change', () => {
            this.populateUserList(userList, searchInput.value, departmentFilter.value);
        });
    }
    
    populateUserList(container, searchQuery, departmentFilter) {
        container.innerHTML = '';

        console.log('users:',this.app.users);
        
        // Filter users based on search query and department
        const filteredUsers = this.app.users.filter(user => {
            const matchesSearch = !searchQuery || 
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase());
                
            const matchesDepartment = !departmentFilter || user.department === departmentFilter;
            
            return matchesSearch && matchesDepartment;
        });
        
        if (filteredUsers.length === 0) {
            container.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }
        
        filteredUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'modal-user-item';
            
            // Add assigned icon if user is already assigned
            const assignedIcon = user.assignedObject ? 
                '<span class="assigned-icon" title="User already assigned">⚠️</span>' : '';
            
            userItem.innerHTML = `
                <div class="modal-user-avatar">
                    <img src="${user.photoUrl}" alt="${user.name}">
                </div>
                <div class="modal-user-details">
                    <div class="modal-user-name">${user.name} ${assignedIcon}</div>
                    <div class="modal-user-email">${user.email}</div>
                    <div class="modal-user-dept">${user.department}</div>
                </div>
            `;
            
            // Add click event to assign this user
            userItem.addEventListener('click', () => {
                if (this.selectedDesk) {
                    this.assignUser(user, this.selectedDesk);
                    
                    // Close the modal after assignment
                    const modal = container.closest('.modal');
                    if (modal) {
                        document.body.removeChild(modal);
                    }
                }
            });
            
            container.appendChild(userItem);
        });
    }
}