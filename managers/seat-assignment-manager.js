class SeatAssignmentManager {
    constructor(app) {
        this.app = app;
        this.selectedUser = null;
        this.selectedDesk = null;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Set up search functionality
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // Add event listener for desk/chair selection
        if (this.app.canvas2d) {
            this.app.canvas2d.on('selection:created', (e) => this.handleObjectSelection(e));
            this.app.canvas2d.on('selection:updated', (e) => this.handleObjectSelection(e));
        }
    }
    
    async handleSearch(query) {
        if (!query || query.length < 2) {
            const searchResults = document.getElementById('search-results');
            if (searchResults) {
                searchResults.innerHTML = '';
                searchResults.classList.remove('active');
            }
            return;
        }
        
        try {
            let filteredUsers = [];
            
            // If we have a server connection, use the API
            if (this.app.serverData) {
                filteredUsers = await this.app.serverData.searchUsers(query);
            } else {
                // Filter users from app memory
                filteredUsers = this.app.users.filter(user => {
                    return user.name.toLowerCase().includes(query.toLowerCase()) || 
                           user.id.toLowerCase().includes(query.toLowerCase()) ||
                           user.email.toLowerCase().includes(query.toLowerCase());
                });
            }
            
            // Display results
            this.displaySearchResults(filteredUsers);
        } catch (error) {
            console.error('Search error:', error);
            // Fallback to local search
            const filteredUsers = this.app.users.filter(user => {
                return user.name.toLowerCase().includes(query.toLowerCase()) || 
                       user.id.toLowerCase().includes(query.toLowerCase()) ||
                       user.email.toLowerCase().includes(query.toLowerCase());
            });
            
            this.displaySearchResults(filteredUsers);
        }
    }
    
    displaySearchResults(users) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;
        
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
                <div class="user-photo">
                    <img src="${user.photoUrl || 'images/default-user.png'}" alt="${user.name}" onerror="this.src='images/default-user.png'">
                </div>
                <div class="user-info">
                    <div class="user-name">${user.name || user.displayName}</div>
                    <div class="user-details">${user.email} - ${user.department || 'No Department'}</div>
                </div>
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
        const selectedObject = e.selected?.[0];
        
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
        if (!propertiesPanel) return;
        
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
                            <img src="${user.photoUrl || 'images/default-user.png'}" alt="${user.name}" 
                                 class="user-photo" onerror="this.src='images/default-user.png'">
                        </div>
                        <div class="user-info">
                            <p>${user.name}</p>
                            <p>${user.email}</p>
                            <p>${user.department || 'No Department'}</p>
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
                        <img src="${this.selectedUser.photoUrl || 'images/default-user.png'}" alt="${this.selectedUser.name}" 
                             class="user-photo" onerror="this.src='images/default-user.png'">
                    </div>
                    <div>
                        <p>${this.selectedUser.name || this.selectedUser.displayName}</p>
                        <p>${this.selectedUser.email}</p>
                        <p>${this.selectedUser.department || 'No Department'}</p>
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
        if (confirm(`Do you want to assign ${user.name || user.displayName} to this desk?`)) {
            this.assignUser(user, desk);
        }
    }
    
    async assignUser(user, desk) {
        try {
            // Start loading indicator
            this.showLoading('Assigning user to seat...');
            
            // Extract seat ID from the desk object
            // Desk ID format is expected to be: seat_123 where 123 is the actual ID
            const seatIdMatch = desk.id.match(/seat_(\d+)/);
            let seatId = null;
            
            if (seatIdMatch) {
                seatId = parseInt(seatIdMatch[1]);
            }
            
            // Prepare assignment data
            const assignmentData = {
                seatId: seatId,
                userId: user.id
            };
            
            // If we have a server connection, use the API to assign the seat
            if (this.app.serverData && seatId) {
                await this.app.serverData.assignSeat(assignmentData);
            }
            
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
            
            // Hide loading indicator
            this.hideLoading();
            this.showSuccess('User assigned successfully');
        } catch (error) {
            console.error('Failed to assign user:', error);
            this.hideLoading();
            this.showError('Failed to assign user: ' + error.message);
            
            // Still update the UI for better UX even if the server call failed
            if (user.assignedObject) {
                user.assignedObject.assignedUser = null;
                user.assignedObject.updateVisualState();
            }
            
            if (desk.assignedUser) {
                desk.assignedUser.assignedObject = null;
            }
            
            desk.assignUser(user);
            user.assignedObject = desk;
            this.updatePropertiesPanel();
            this.app.canvas2d.renderAll();
        }
    }
    
    async removeAssignment(desk) {
        if (!desk.assignedUser) return;
        
        try {
            // Start loading indicator
            this.showLoading('Removing seat assignment...');
            
            // Extract seat ID from the desk object
            const seatIdMatch = desk.id.match(/seat_(\d+)/);
            let seatId = null;
            
            if (seatIdMatch) {
                seatId = parseInt(seatIdMatch[1]);
            }
            
            // If we have a server connection, use the API to unassign the seat
            if (this.app.serverData && seatId) {
                await this.app.serverData.unassignSeat(seatId);
            }
            
            // Update local objects
            const user = desk.assignedUser;
            user.assignedObject = null;
            desk.assignedUser = null;
            desk.updateVisualState();
            
            // Update UI
            this.updatePropertiesPanel();
            this.app.canvas2d.renderAll();
            
            // Hide loading indicator
            this.hideLoading();
            this.showSuccess('User unassigned successfully');
        } catch (error) {
            console.error('Failed to remove assignment:', error);
            this.hideLoading();
            this.showError('Failed to remove assignment: ' + error.message);
            
            // Still update the UI for better UX even if the server call failed
            const user = desk.assignedUser;
            user.assignedObject = null;
            desk.assignedUser = null;
            desk.updateVisualState();
            this.updatePropertiesPanel();
            this.app.canvas2d.renderAll();
        }
    }
    
    async showUserAssignmentModal() {
        // Create modal HTML
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
                    <div class="loading">Loading users...</div>
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
        
        // Load all users
        try {
            let users = [];
            
            // If we have a server connection, use the API
            if (this.app.serverData) {
                users = await this.app.serverData.getUsers();
            } else {
                // Use users from app memory
                users = this.app.users;
            }
            
            // Populate user list
            this.populateUserList(userList, users, '', '');
            
            // Add search and filter functionality
            searchInput.addEventListener('input', () => {
                const searchValue = searchInput.value;
                const filterValue = departmentFilter.value;
                
                // Filter users based on search and department
                const filteredUsers = users.filter(user => {
                    const matchesSearch = !searchValue || 
                        (user.name || user.displayName || '').toLowerCase().includes(searchValue.toLowerCase()) ||
                        (user.email || '').toLowerCase().includes(searchValue.toLowerCase()) ||
                        (user.id || '').toLowerCase().includes(searchValue.toLowerCase());
                        
                    const matchesDepartment = !filterValue || 
                        (user.department || '').toLowerCase() === filterValue.toLowerCase();
                    
                    return matchesSearch && matchesDepartment;
                });
                
                this.populateUserList(userList, filteredUsers, searchValue, filterValue);
            });
            
            departmentFilter.addEventListener('change', () => {
                const searchValue = searchInput.value;
                const filterValue = departmentFilter.value;
                
                // Filter users based on search and department
                const filteredUsers = users.filter(user => {
                    const matchesSearch = !searchValue || 
                        (user.name || user.displayName || '').toLowerCase().includes(searchValue.toLowerCase()) ||
                        (user.email || '').toLowerCase().includes(searchValue.toLowerCase()) ||
                        (user.id || '').toLowerCase().includes(searchValue.toLowerCase());
                        
                    const matchesDepartment = !filterValue || 
                        (user.department || '').toLowerCase() === filterValue.toLowerCase();
                    
                    return matchesSearch && matchesDepartment;
                });
                
                this.populateUserList(userList, filteredUsers, searchValue, filterValue);
            });
        } catch (error) {
            console.error('Failed to load users:', error);
            userList.innerHTML = '<div class="error">Failed to load users. Please try again.</div>';
        }
    }
    
    populateUserList(container, users, searchQuery, departmentFilter) {
        container.innerHTML = '';
        
        if (!users || users.length === 0) {
            container.innerHTML = '<div class="no-results">No users found</div>';
            return;
        }
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'modal-user-item';
            
            // Add assigned icon if user is already assigned
            const assignedIcon = user.assignedObject ? 
                '<span class="assigned-icon" title="User already assigned">⚠️</span>' : '';
            
            // Determine user name (handle different property names)
            const userName = user.name || user.displayName || user.email || 'Unknown User';
            
            userItem.innerHTML = `
                <div class="modal-user-avatar">
                    <img src="${user.photoUrl || 'images/default-user.png'}" alt="${userName}" 
                         onerror="this.src='images/default-user.png'">
                </div>
                <div class="modal-user-details">
                    <div class="modal-user-name">${userName} ${assignedIcon}</div>
                    <div class="modal-user-email">${user.email || 'No email'}</div>
                    <div class="modal-user-dept">${user.department || 'No Department'}</div>
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
    
    // Helper methods for UI loading/notifications
    showLoading(message) {
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
    
    showNotification(message, type = 'info') {
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