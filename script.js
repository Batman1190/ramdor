// Utility functions
const showLoading = (show) => {
    const spinner = document.querySelector('.upload-spinner') || 
                   document.createElement('div');
    spinner.className = 'upload-spinner';
    if (show) {
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    } else {
        spinner.remove();
    }
};

const showError = (message) => {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
};

const showModal = (content) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = content;
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
};

// Main application code
document.addEventListener('DOMContentLoaded', async () => {
    // Clear any existing content in the video grid immediately
    const videoGrid = document.querySelector('.video-grid');
    if (videoGrid) {
        videoGrid.innerHTML = `
            <div class="loading-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading videos...</p>
            </div>
        `;
    }

    // Add styles for loading and placeholders
    const style = document.createElement('style');
    style.textContent = `
        /* Base styles */
        :root {
            --header-height: 60px;
            --sidebar-width: 240px;
            --main-padding: 20px;
        }

        /* Main content positioning */
        .main-content {
            margin-left: var(--sidebar-width);
            padding-top: var(--header-height);
            min-height: 100vh;
            position: relative;
            z-index: 1;
        }

        /* Sidebar positioning */
        .sidebar {
            position: fixed;
            left: 0;
            top: var(--header-height);
            width: var(--sidebar-width);
            height: calc(100vh - var(--header-height));
            z-index: 2;
            background: var(--background-color);
        }

        /* Video grid improvements */
        .video-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            padding: var(--main-padding);
            width: 100%;
            max-width: 1600px;
            margin: 0 auto;
        }

        /* Video loading optimization */
        .video-card video {
            width: 100%;
            height: auto;
            max-height: 200px;
            object-fit: cover;
            background: #000;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            :root {
                --sidebar-width: 0;
                --main-padding: 10px;
            }

            .main-content {
                margin-left: 0;
                padding-top: calc(var(--header-height) + 10px);
            }

            .sidebar {
                position: fixed;
                left: -100%;
                width: 80%;
                max-width: 300px;
                transition: left 0.3s ease;
                box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
            }

            .sidebar.active {
                left: 0;
            }

            .video-grid {
                grid-template-columns: 1fr;
                gap: 15px;
                padding: 10px;
            }

            .video-card {
                margin-bottom: 15px;
            }
        }

        /* Loading optimization */
        .video-card {
            opacity: 0;
            animation: fadeIn 0.3s ease-in forwards;
            background: var(--background-color);
            border-radius: 8px;
            overflow: hidden;
        }

        .video-placeholder {
            width: 100%;
            height: 200px;
            background: rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Prevent FOUC (Flash of Unstyled Content) */
        .video-grid {
            opacity: 0;
            animation: fadeIn 0.3s ease-in forwards;
            animation-delay: 0.1s;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Authentication handling
    const loginBtn = document.querySelector('.login-btn');
    const uploadBtn = document.querySelector('.upload-btn');
    let currentUser = null;
    
    try {
        // Check if user is logged in
        console.log('Checking auth status...');
        const { data, error } = await window.supabaseClient.auth.getSession();
        currentUser = data?.session?.user;
        console.log('Session data:', data);

        // If no session but we have stored user data, try to restore the session
        if (!currentUser) {
            console.log('No active session, checking localStorage...');
            const storedUser = localStorage.getItem('ramdor_user');
            if (storedUser) {
                console.log('Found stored user data');
                currentUser = JSON.parse(storedUser);
                console.log('Current user:', currentUser);
            }
        }

        if (currentUser) {
            console.log('User is logged in:', currentUser);
            // Update login button and upload button
            loginBtn.textContent = 'Sign Out';
            uploadBtn.style.display = 'block';

            // Update user profile display
            const userNameElement = document.querySelector('.user-name');
            const profilePicElement = document.querySelector('.profile-pic');

            console.log('User metadata:', currentUser.user_metadata);
            if (userNameElement) {
                const displayName = currentUser.user_metadata?.full_name || 
                                  currentUser.user_metadata?.name ||
                                  currentUser.email?.split('@')[0] ||
                                  'User';
                console.log('Setting display name:', displayName);
                userNameElement.textContent = displayName;
                userNameElement.style.display = 'block';
            } else {
                console.log('User name element not found');
            }

            if (profilePicElement) {
                const avatarUrl = currentUser.user_metadata?.avatar_url ||
                                currentUser.user_metadata?.picture;
                console.log('Avatar URL:', avatarUrl);
                if (avatarUrl) {
                    profilePicElement.src = avatarUrl;
                    profilePicElement.style.display = 'block';
                }
            } else {
                console.log('Profile pic element not found');
            }
        } else {
            console.log('User is not logged in');
            loginBtn.textContent = 'Sign In';
            uploadBtn.style.display = 'none';

            // Hide user profile elements
            const userNameElement = document.querySelector('.user-name');
            const profilePicElement = document.querySelector('.profile-pic');
            
            if (userNameElement) userNameElement.style.display = 'none';
            if (profilePicElement) profilePicElement.style.display = 'none';
            
            // Clear stored user data
            localStorage.removeItem('ramdor_user');
        }
    } catch (err) {
        console.error('Error checking auth status:', err);
        showError('Error checking authentication status');
    }

    // Login/Logout handling
    loginBtn.addEventListener('click', async () => {
        try {
            if (!window.supabaseClient) {
                console.error('Supabase not initialized');
                showError('Authentication service not available');
                return;
            }
            
            if (currentUser) {
                console.log('Signing out...');
                showLoading(true);
                await window.supabaseClient.auth.signOut();
                localStorage.removeItem('ramdor_user');
                window.location.reload();
            } else {
                const useGoogle = confirm('This app uses Google Sign In. If you don\'t have a Google account, you can create one with your existing email address. Would you like to continue?');
                
                if (useGoogle) {
                    console.log('Starting Google sign in...');
                    showLoading(true);
                    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: 'https://batman1190.github.io/ramdor/callback.html',
                            queryParams: {
                                access_type: 'offline',
                                prompt: 'consent'
                            }
                        }
                    });
                    if (error) throw error;
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            showError(`Login error: ${err.message}`);
        } finally {
            showLoading(false);
        }
    });

    // Upload handling
    uploadBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showError('Please sign in to upload videos');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            // Validate file size (max 100MB)
            const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
            if (file.size > MAX_FILE_SIZE) {
                showError('File size exceeds 100MB limit');
                return;
            }

            // Validate file type
            const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
            if (!validTypes.includes(file.type)) {
                showError('Please upload a valid video file (MP4, WebM, or OGG)');
                return;
            }

            console.log('Starting upload for:', file.name);
            const fileName = `${Date.now()}-${file.name}`;
            
            try {
                showLoading(true);
                console.log('Uploading to storage...');
                // Upload to Supabase Storage
                const { data, error } = await window.supabaseClient.storage
                    .from('videos')
                    .upload(`${currentUser.id}/${fileName}`, file, {
                        upsert: false
                    });

                if (error) {
                    console.error('Storage upload error:', error);
                    showError(`Error uploading video: ${error.message}`);
                    return;
                }

                console.log('Storage upload successful, saving to database...');
                const { data: videoData, error: dbError } = await window.supabaseClient
                    .from('videos')
                    .insert([{
                        title: file.name,
                        url: `${currentUser.id}/${fileName}`,
                        user_id: currentUser.id,
                        views: 0,
                        description: '' // Initialize with empty description
                    }])
                    .select();
        
                if (dbError) {
                    console.error('Database error:', dbError);
                    showError(`Error saving video metadata: ${dbError.message}`);
                    return;
                }
        
                showError('Video uploaded successfully! You can now add a description by clicking the Edit Details button.');
                loadVideos();
            } catch (err) {
                console.error('Upload error:', err);
                showError(`Upload error: ${err.message}`);
            } finally {
                showLoading(false);
            }
        };
        
        input.click();
    });

    // Video loading functions
    async function loadVideos() {
        try {
            showLoading(true);
            
            // Get videos from database with strict filtering
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*, views')  // Explicitly include views
                .not('url', 'is', null)
                .not('user_id', 'is', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading videos:', error);
                showError('Error loading videos');
                return [];
            }

            // Validate each video before returning
            const validVideos = [];
            for (const video of videos) {
                try {
                    // Basic validation
                    if (!video || !video.id || !video.url || !video.user_id) {
                        console.log('Invalid video data:', video);
                        await forceDeleteVideo(video);
                        continue;
                    }

                    // Check if video file exists in storage
                    const { data } = window.supabaseClient.storage
                        .from('videos')
                        .getPublicUrl(video.url);

                    if (!data || !data.publicUrl) {
                        console.log('Invalid video URL, deleting:', video.id);
                        await forceDeleteVideo(video);
                        continue;
                    }

                    // Verify file exists with HEAD request
                    try {
                        const response = await fetch(data.publicUrl, {
                            method: 'HEAD',
                            timeout: 3000
                        });

                        if (!response.ok) {
                            console.log('Video file not accessible, deleting:', video.id);
                            await forceDeleteVideo(video);
                            continue;
                        }

                        // If all checks pass, add to valid videos
                        validVideos.push(video);
                    } catch (fetchErr) {
                        console.log('Error checking video file, deleting:', video.id);
                        await forceDeleteVideo(video);
                    }
                } catch (err) {
                    console.error('Error processing video:', err);
                    if (video) {
                        await forceDeleteVideo(video);
                    }
                }
            }

            return validVideos;
        } catch (err) {
            console.error('Error in loadVideos:', err);
            showError('Error loading videos');
            return [];
        } finally {
            showLoading(false);
        }
    }

    // Update view count function to properly persist counts
    async function incrementViewCount(video, viewCountElement) {
        if (!video || !video.id) return;

        try {
            // Simple update query without any joins or complex selects
            const { error } = await window.supabaseClient
                .from('videos')
                .update({
                    views: (video.views || 0) + 1
                })
                .eq('id', video.id);

            if (error) {
                console.error('Error updating view count:', error);
                return;
            }

            // Update local state and UI
            video.views = (video.views || 0) + 1;
            if (viewCountElement) {
                viewCountElement.innerHTML = `<i class="fas fa-eye"></i> ${video.views} views`;
                // Update the video card's data attribute
                const videoCard = viewCountElement.closest('.video-card');
                if (videoCard) {
                    videoCard.setAttribute('data-views', video.views);
                }
            }

            console.log(`Updated view count for video ${video.id} to ${video.views}`);

        } catch (err) {
            console.error('Error in incrementViewCount:', err);
        }
    }

    // Modify the video event listener for better view counting
    function addViewCountListener(videoElement, video, viewCountElement) {
        // Initialize views if not set
        if (typeof video.views === 'undefined' || video.views === null) {
            video.views = 0;
        }
        
        let viewCounted = false;
        
        videoElement.addEventListener('play', () => {
            if (!viewCounted) {
                viewCounted = true;
                incrementViewCount(video, viewCountElement);
            }
        });

        videoElement.addEventListener('ended', () => {
            viewCounted = false;
        });

        videoElement.addEventListener('seeked', () => {
            if (videoElement.currentTime === 0) {
                viewCounted = false;
            }
        });
    }

    async function displayVideos(videos) {
        const videoGrid = document.querySelector('.video-grid');
        if (!videoGrid) return;
        
        // Clear grid
        videoGrid.innerHTML = '';

        if (!videos || !Array.isArray(videos) || videos.length === 0) {
            videoGrid.innerHTML = `
                <div class="no-videos">
                    <i class="fas fa-video-slash"></i>
                    <p>No videos found</p>
                </div>
            `;
            return;
        }

        // Get fresh view counts for all videos
        const videoIds = videos.map(v => v.id);
        const { data: freshViewCounts, error: viewCountError } = await window.supabaseClient
            .from('videos')
            .select('id, views')
            .in('id', videoIds);

        if (viewCountError) {
            console.error('Error fetching fresh view counts:', viewCountError);
        }

        // Create a map of video IDs to their fresh view counts
        const viewCountMap = new Map();
        if (freshViewCounts) {
            freshViewCounts.forEach(v => viewCountMap.set(v.id, v.views || 0));
        }

        for (const video of videos) {
            try {
                // Skip invalid videos
                if (!video || !video.id || !video.url || !video.user_id) {
                    console.log('Skipping invalid video:', video);
                    continue;
                }

                const card = document.createElement('div');
                card.className = 'video-card';
                card.setAttribute('data-video-id', video.id);
                
                // Use fresh view count from database if available, fallback to video object
                const currentViews = viewCountMap.get(video.id) ?? video.views ?? 0;
                card.setAttribute('data-views', currentViews);

                // Get video URL
                const { data } = window.supabaseClient.storage
                    .from('videos')
                    .getPublicUrl(video.url);

                if (!data || !data.publicUrl) {
                    console.log('Invalid video URL for video:', video.id);
                    continue;
                }

                // Create card content with view count
                card.innerHTML = `
                    <div class="video-header">
                        ${currentUser ? `
                            <div class="video-controls">
                                ${currentUser.id === video.user_id ? `
                                    <button class="edit-btn" title="Edit video">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="delete-btn" title="Delete video">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                ` : ''}
                                <button class="download-btn" title="Download video">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <video controls preload="none">
                        <source src="${data.publicUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-info">
                        <h3>${video.title || 'Untitled'}</h3>
                        <div class="description-container">
                            <p class="video-description">${video.description || ''}</p>
                        </div>
                        <div class="video-metadata">
                            <p class="view-count" data-video-id="${video.id}">
                                <i class="fas fa-eye"></i> ${currentViews} views
                            </p>
                            ${currentUser && currentUser.id === video.user_id ? `
                                <button class="edit-description-btn">
                                    <i class="fas fa-edit"></i>
                                    Edit Details
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;

                // Add event listeners
                const videoElement = card.querySelector('video');
                const viewCountElement = card.querySelector('.view-count');

                // Add view count tracking with persistence
                if (videoElement && viewCountElement) {
                    addViewCountListener(videoElement, { ...video, views: currentViews }, viewCountElement);
                }

                // Add edit functionality
                const editBtn = card.querySelector('.edit-btn, .edit-description-btn');
                if (editBtn && currentUser && currentUser.id === video.user_id) {
                    editBtn.addEventListener('click', () => handleEditClick(video));
                }

                // Add delete functionality
                const deleteBtn = card.querySelector('.delete-btn');
                if (deleteBtn && currentUser && currentUser.id === video.user_id) {
                    deleteBtn.addEventListener('click', () => handleDeleteClick(video));
                }

                // Add download functionality
                const downloadBtn = card.querySelector('.download-btn');
                if (downloadBtn && currentUser) {
                    downloadBtn.addEventListener('click', () => handleDownloadClick(video));
                }

                videoGrid.appendChild(card);
            } catch (err) {
                console.error('Error creating video card:', err, video);
            }
        }
    }

    // Handle edit click
    async function handleEditClick(video) {
        const modal = showModal(`
            <div class="modal-content">
                <h2>Edit Video Details</h2>
                <div class="form-group">
                    <label for="video-title">Title</label>
                    <input type="text" id="video-title" value="${video.title || ''}" placeholder="Enter video title">
                </div>
                <div class="form-group">
                    <label for="video-description">Description</label>
                    <textarea id="video-description" placeholder="Enter video description">${video.description || ''}</textarea>
                </div>
                <div class="modal-buttons">
                    <button type="submit" class="save-btn">Save Changes</button>
                    <button class="cancel">Cancel</button>
                </div>
            </div>
        `);

        const form = modal.querySelector('.modal-content');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newTitle = form.querySelector('#video-title').value;
            const newDescription = form.querySelector('#video-description').value;

            try {
                showLoading(true);
                const { error } = await window.supabaseClient
                    .from('videos')
                    .update({
                        title: newTitle,
                        description: newDescription
                    })
                    .eq('id', video.id);

                if (error) throw error;
                
                modal.remove();
                showError('Video details updated successfully');
                
                // Refresh the current section
                const activeSection = document.querySelector('.sidebar-item.active span').textContent.toLowerCase();
                switch (activeSection) {
                    case 'home':
                        await loadHomeVideos();
                        break;
                    case 'explore':
                        await loadExploreVideos();
                        break;
                    case 'trending':
                        await loadTrendingVideos();
                        break;
                    case 'library':
                        await loadLibraryVideos();
                        break;
                }
            } catch (err) {
                console.error('Error updating video:', err);
                showError(`Error updating video: ${err.message}`);
            } finally {
                showLoading(false);
            }
        });

        modal.querySelector('.cancel').addEventListener('click', () => modal.remove());
    }

    // Handle delete click
    async function handleDeleteClick(video) {
        if (confirm('Are you sure you want to delete this video?')) {
            await deleteVideo(video.id);
        }
    }

    // Handle download click
    function handleDownloadClick(video) {
        const { data } = window.supabaseClient.storage
            .from('videos')
            .getPublicUrl(video.url);
        
        const a = document.createElement('a');
        a.href = data.publicUrl;
        a.download = video.title || 'video';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async function loadHomeVideos() {
        try {
            const videos = await loadVideos();
            if (Array.isArray(videos)) {
                await displayVideos(videos);
            }
        } catch (err) {
            console.error('Error in loadHomeVideos:', err);
            showError('Error loading videos');
        }
    }

    async function loadExploreVideos() {
        try {
            const videos = await loadVideos();
            const shuffledVideos = videos.sort(() => Math.random() - 0.5);
            await displayVideos(shuffledVideos);
        } catch (err) {
            console.error('Error loading explore videos:', err);
            showError('Error loading explore videos');
            await displayVideos([]);
        }
    }

    async function loadTrendingVideos() {
        try {
            const videos = await loadVideos();
            
            // Filter for last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const recentVideos = videos.filter(video => 
                new Date(video.created_at) >= sevenDaysAgo
            );

            // Sort by views and get top 20
            const sortedVideos = recentVideos
                .sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0))
                .slice(0, 20);

            await displayVideos(sortedVideos);
        } catch (err) {
            console.error('Error loading trending videos:', err);
            showError('Error loading trending videos');
            await displayVideos([]);
        }
    }

    async function loadLibraryVideos() {
        if (!currentUser) {
            showError('Please sign in to view your library');
            await displayVideos([]);
            return;
        }

        try {
            const allVideos = await loadVideos();
            const userVideos = allVideos.filter(video => 
                video.user_id === currentUser.id
            );
            await displayVideos(userVideos);
        } catch (err) {
            console.error('Error loading library videos:', err);
            showError('Error loading library videos');
            await displayVideos([]);
        }
    }

    // Sidebar navigation handling
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', async () => {
            // Remove active class from all items
            sidebarItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Show loading state
            showLoading(true);

            try {
                const itemText = item.querySelector('span').textContent.toLowerCase();

                switch (itemText) {
                    case 'home':
                        await loadHomeVideos();
                        break;
                    case 'explore':
                        await loadExploreVideos();
                        break;
                    case 'trending':
                        await loadTrendingVideos();
                        break;
                    case 'library':
                        await loadLibraryVideos();
                        break;
                }
            } catch (err) {
                console.error('Error handling navigation:', err);
                showError('Error loading content');
            } finally {
                showLoading(false);
            }
        });
    });

    // Run cleanup before loading videos
    await cleanupInvalidEntries();
    
    // Initial load of home videos
    await loadHomeVideos();

    async function deleteVideo(videoId) {
        try {
            showLoading(true);
            
            // First, get the video details
            const { data: video, error: fetchError } = await window.supabaseClient
                .from('videos')
                .select('*')
                .eq('id', videoId)
                .single();

            if (fetchError) throw fetchError;

            // Delete from storage first
            if (video.url) {
                const { error: storageError } = await window.supabaseClient.storage
                    .from('videos')
                    .remove([video.url]);

                if (storageError) {
                    console.error('Storage delete error:', storageError);
                    // Continue even if storage delete fails
                }
            }

            // Then delete from database
            const { error: dbError } = await window.supabaseClient
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (dbError) throw dbError;

            // Force a complete reload of the current section
            const activeSection = document.querySelector('.sidebar-item.active span').textContent.toLowerCase();
            switch (activeSection) {
                case 'home':
                    await loadHomeVideos();
                    break;
                case 'explore':
                    await loadExploreVideos();
                    break;
                case 'trending':
                    await loadTrendingVideos();
                    break;
                case 'library':
                    await loadLibraryVideos();
                    break;
            }

            showError('Video deleted successfully');
            return true;
        } catch (err) {
            console.error('Error deleting video:', err);
            showError(`Error deleting video: ${err.message}`);
            return false;
        } finally {
            showLoading(false);
        }
    }

    // Update forceDeleteVideo to be more thorough
    async function forceDeleteVideo(video) {
        if (!video || !video.id) return false;

        try {
            console.log('Force deleting video:', video.id);
            
            // Try to delete from storage first
            if (video.url) {
                try {
                    await window.supabaseClient.storage
                        .from('videos')
                        .remove([video.url]);
                } catch (storageErr) {
                    console.log('Storage delete error (continuing):', storageErr);
                }
            }

            // Delete from database with multiple fallback approaches
            try {
                // Try direct deletion first
                const { error: directError } = await window.supabaseClient
                    .from('videos')
                    .delete()
                    .eq('id', video.id);

                if (directError) {
                    // If direct deletion fails, try RPC method
                    const { error: rpcError } = await window.supabaseClient.rpc('force_delete_video', {
                        video_id: video.id
                    });
                    
                    if (rpcError) {
                        // Final attempt with force flag
                        const { error: finalError } = await window.supabaseClient
                            .from('videos')
                            .delete()
                            .eq('id', video.id)
                            .throwOnError();
                            
                        if (finalError) throw finalError;
                    }
                }
            } catch (dbErr) {
                console.error('All deletion attempts failed for video:', video.id, dbErr);
                // Try one last time with a raw delete
                await window.supabaseClient
                    .from('videos')
                    .delete()
                    .eq('id', video.id);
            }

            return true;
        } catch (err) {
            console.error('Force delete failed for video:', video.id, err);
            return false;
        }
    }

    // Update cleanupInvalidEntries to be more aggressive
    async function cleanupInvalidEntries() {
        try {
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*');

            if (error) throw error;

            if (videos && videos.length > 0) {
                const invalidVideos = videos.filter(video => 
                    !video || 
                    !video.id || 
                    !video.url || 
                    !video.user_id ||
                    video.title === 'Test Video 1' ||
                    video.title === 'Test Video 2'
                );

                for (const video of invalidVideos) {
                    await forceDeleteVideo(video);
                }

                if (invalidVideos.length > 0) {
                    console.log(`Cleaned up ${invalidVideos.length} invalid videos`);
                    await loadHomeVideos(); // Refresh the video list
                }
            }
        } catch (err) {
            console.error('Error cleaning up invalid videos:', err);
        }
    }

    // Add mobile navigation toggle button
    const mobileNavToggle = document.createElement('button');
    mobileNavToggle.className = 'mobile-nav-toggle';
    mobileNavToggle.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.insertBefore(mobileNavToggle, document.body.firstChild);

    // Toggle sidebar on mobile
    mobileNavToggle.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('active');
        mobileNavToggle.innerHTML = sidebar.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const toggle = document.querySelector('.mobile-nav-toggle');
        
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            !toggle.contains(e.target)) {
            sidebar.classList.remove('active');
            toggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });

    // Handle orientation change
    window.addEventListener('orientationchange', () => {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.remove('active');
        mobileNavToggle.innerHTML = '<i class="fas fa-bars"></i>';
    });
});