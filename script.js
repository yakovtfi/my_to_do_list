/**
 * Professional To-Do List Application
 * Features: Time tracking, timeline view, filtering, dark mode, animations
 * @version 2.0.0
 */

// ==================== DOM Elements ====================
const newTaskInput = document.getElementById('new-task');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const themeToggle = document.getElementById('theme-toggle');
const timelineToggle = document.getElementById('timeline-toggle');
const timelineModal = document.getElementById('timeline-modal');
const closeTimeline = document.getElementById('close-timeline');
const timelineContent = document.getElementById('timeline-content');
const totalTasksEl = document.getElementById('total-tasks');
const activeTasksEl = document.getElementById('active-tasks');
const completedTasksEl = document.getElementById('completed-tasks');

// ==================== State Management ====================
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let theme = localStorage.getItem('theme') || 'light';

// ==================== Initialization ====================
/**
 * Initialize the application
 */
function init() {
    // Apply saved theme
    applyTheme(theme);
    
    // Render initial tasks
    renderTasks();
    updateStats();
    
    // Event listeners
    addTaskBtn.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', handleKeyPress);
    themeToggle.addEventListener('click', toggleTheme);
    timelineToggle.addEventListener('click', openTimeline);
    closeTimeline.addEventListener('click', closeTimelineModal);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setFilter(e.target.dataset.filter);
        });
    });
    
    // Close modal on outside click
    timelineModal.addEventListener('click', (e) => {
        if (e.target === timelineModal) {
            closeTimelineModal();
        }
    });
    
    // Accessibility: ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !timelineModal.classList.contains('hidden')) {
            closeTimelineModal();
        }
    });
}

// ==================== Task Management ====================
/**
 * Add a new task
 */
function addTask() {
    const taskText = newTaskInput.value.trim();
    
    if (taskText === '') {
        showNotification('Please enter a task!', 'error');
        newTaskInput.focus();
        return;
    }
    
    const now = new Date();
    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: now.toISOString(),
        startedAt: null,
        completedAt: null,
        duration: null
    };
    
    tasks.unshift(task); // Add to beginning for better UX
    saveTasks();
    renderTasks();
    updateStats();
    newTaskInput.value = '';
    newTaskInput.focus();
    showNotification('Task added successfully!', 'success');
}

/**
 * Delete a task
 * @param {number} id - Task ID
 */
function deleteTask(id) {
    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) return;
    
    tasks.splice(taskIndex, 1);
    saveTasks();
    renderTasks();
    updateStats();
    showNotification('Task deleted', 'info');
}

/**
 * Toggle task completion status
 * @param {number} id - Task ID
 */
function toggleTask(id) {
    const task = tasks.find(task => task.id === id);
    if (!task) return;
    
    const now = new Date();
    
    if (!task.completed) {
        // Marking as complete
        task.completed = true;
        task.completedAt = now.toISOString();
        
        // Calculate duration if task was started
        if (task.startedAt) {
            const start = new Date(task.startedAt);
            const end = now;
            task.duration = Math.floor((end - start) / 1000); // Duration in seconds
        }
        showNotification('Task completed! 🎉', 'success');
    } else {
        // Marking as incomplete
        task.completed = false;
        task.completedAt = null;
        task.duration = null;
        showNotification('Task reopened', 'info');
    }
    
    saveTasks();
    renderTasks();
    updateStats();
}

/**
 * Start tracking time for a task
 * @param {number} id - Task ID
 */
function startTask(id) {
    const task = tasks.find(task => task.id === id);
    if (!task || task.completed) return;
    
    task.startedAt = new Date().toISOString();
    saveTasks();
    renderTasks();
    showNotification('Timer started', 'info');
}

/**
 * Edit task text
 * @param {number} id - Task ID
 */
function editTask(id) {
    const task = tasks.find(task => task.id === id);
    if (!task) return;
    
    const newText = prompt('Edit task:', task.text);
    if (newText && newText.trim() !== '') {
        task.text = newText.trim();
        saveTasks();
        renderTasks();
        showNotification('Task updated', 'success');
    }
}

// ==================== Rendering ====================
/**
 * Render all tasks based on current filter
 */
function renderTasks() {
    taskList.innerHTML = '';
    
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    filteredTasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'task-item-completed' : ''} animate-slide-in`;
        li.style.animationDelay = `${index * 50}ms`;
        
        li.innerHTML = `
            <div class="flex items-start gap-3 flex-1">
                <!-- Checkbox -->
                <button 
                    onclick="toggleTask(${task.id})" 
                    class="flex-shrink-0 mt-1 w-5 h-5 rounded-full border-2 transition-all duration-200
                           ${task.completed 
                             ? 'bg-apple-blue border-apple-blue' 
                             : 'border-gray-300 dark:border-apple-gray-600 hover:border-apple-blue'}"
                    aria-label="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}"
                >
                    ${task.completed ? `
                        <svg class="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                        </svg>
                    ` : ''}
                </button>
                
                <!-- Task Content -->
                <div class="flex-1 min-w-0">
                    <p class="text-gray-800 dark:text-white font-medium ${task.completed ? 'line-through opacity-60' : ''} break-words">
                        ${escapeHtml(task.text)}
                    </p>
                    <div class="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span class="flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            ${formatDate(task.createdAt)}
                        </span>
                        ${task.startedAt && !task.completed ? `
                            <span class="flex items-center gap-1 text-apple-blue">
                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                                </svg>
                                In progress
                            </span>
                        ` : ''}
                        ${task.duration ? `
                            <span class="flex items-center gap-1 text-green-500">
                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                </svg>
                                ${formatDuration(task.duration)}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-2 ml-3">
                ${!task.completed && !task.startedAt ? `
                    <button 
                        onclick="startTask(${task.id})" 
                        class="icon-button text-apple-blue hover:bg-blue-50 dark:hover:bg-blue-900"
                        aria-label="Start task"
                        title="Start timer"
                    >
                        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </button>
                ` : ''}
                <button 
                    onclick="editTask(${task.id})" 
                    class="icon-button text-gray-600 dark:text-gray-400"
                    aria-label="Edit task"
                    title="Edit task"
                >
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button 
                    onclick="deleteTask(${task.id})" 
                    class="icon-button text-red-500 hover:bg-red-50 dark:hover:bg-red-900"
                    aria-label="Delete task"
                    title="Delete task"
                >
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `;
        
        taskList.appendChild(li);
    });
}

/**
 * Update statistics display
 */
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    
    totalTasksEl.textContent = total;
    activeTasksEl.textContent = active;
    completedTasksEl.textContent = completed;
}

// ==================== Timeline ====================
/**
 * Open timeline modal
 */
function openTimeline() {
    timelineModal.classList.remove('hidden');
    renderTimeline();
}

/**
 * Close timeline modal
 */
function closeTimelineModal() {
    timelineModal.classList.add('hidden');
}

/**
 * Render timeline view
 */
function renderTimeline() {
    if (tasks.length === 0) {
        timelineContent.innerHTML = `
            <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No tasks in timeline yet</p>
            </div>
        `;
        return;
    }
    
    // Sort tasks by creation date (newest first)
    const sortedTasks = [...tasks].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    timelineContent.innerHTML = sortedTasks.map(task => `
        <div class="relative pl-8 pb-8 border-l-2 ${task.completed ? 'border-green-500' : 'border-apple-blue'} last:border-l-0 last:pb-0">
            <!-- Timeline dot -->
            <div class="absolute -left-2 top-0 w-4 h-4 rounded-full ${task.completed ? 'bg-green-500' : 'bg-apple-blue'}"></div>
            
            <!-- Content -->
            <div class="bg-white dark:bg-apple-gray-800 rounded-xl p-4 shadow-sm">
                <h3 class="font-semibold text-gray-800 dark:text-white mb-2 ${task.completed ? 'line-through opacity-60' : ''}">
                    ${escapeHtml(task.text)}
                </h3>
                <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        <span>Created: ${formatFullDate(task.createdAt)}</span>
                    </div>
                    ${task.startedAt ? `
                        <div class="flex items-center gap-2 text-apple-blue">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Started: ${formatFullDate(task.startedAt)}</span>
                        </div>
                    ` : ''}
                    ${task.completedAt ? `
                        <div class="flex items-center gap-2 text-green-500">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                            <span>Completed: ${formatFullDate(task.completedAt)}</span>
                        </div>
                    ` : ''}
                    ${task.duration ? `
                        <div class="flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                            </svg>
                            <span>Duration: ${formatDuration(task.duration)}</span>
                        </div>
                    ` : ''}
                </div>
                <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                    task.completed 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }">
                    ${task.completed ? '✓ Completed' : '◷ Active'}
                </span>
            </div>
        </div>
    `).join('');
}

// ==================== Filtering ====================
/**
 * Set current filter
 * @param {string} filter - Filter type
 */
function setFilter(filter) {
    currentFilter = filter;
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    renderTasks();
}

/**
 * Get filtered tasks
 * @returns {Array} Filtered tasks
 */
function getFilteredTasks() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (currentFilter) {
        case 'active':
            return tasks.filter(t => !t.completed);
        case 'completed':
            return tasks.filter(t => t.completed);
        case 'today':
            return tasks.filter(t => new Date(t.createdAt) >= todayStart);
        default:
            return tasks;
    }
}

// ==================== Theme Management ====================
/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
    localStorage.setItem('theme', theme);
}

/**
 * Apply theme to document
 * @param {string} themeName - Theme name
 */
function applyTheme(themeName) {
    if (themeName === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// ==================== Utilities ====================
/**
 * Save tasks to localStorage
 */
function saveTasks() {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving tasks:', error);
        showNotification('Error saving tasks', 'error');
    }
}

/**
 * Handle keyboard events
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyPress(e) {
    if (e.key === 'Enter') {
        addTask();
    }
}

/**
 * Format date for display (relative)
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Format date for timeline (full)
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatFullDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
    // Simple console log for now - could be enhanced with toast notifications
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ==================== Initialize App ====================
init();
