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
        .loading-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: var(--text-color);
            gap: 1rem;
        }
        .loading-placeholder i {
            font-size: 2rem;
        }
        .video-grid {
            min-height: 200px;
        }
        .video-card {
            opacity: 0;
            animation: fadeIn 0.3s ease-in forwards;
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
    async function loadVideos(sortBy = 'recent') {
        try {
            showLoading(true);
            
            // Clear the video grid first
            const videoGrid = document.querySelector('.video-grid');
            videoGrid.innerHTML = `
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading videos...</p>
                </div>
            `;

            // Get all videos with their current view counts
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('id, title, url, user_id, views, description, created_at')
                .not('user_id', 'is', null)
                .lt('created_at', new Date().toISOString());

            if (error) {
                console.error('Error loading videos:', error);
                showError('Error loading videos');
                return [];
            }

            console.log('Loaded videos from database:', videos);

            // Check each video's existence and initialize view count if needed
            const validVideos = [];
            for (const video of videos) {
                try {
                    console.log('Processing video:', { 
                        id: video.id, 
                        title: video.title, 
                        description: video.description 
                    });

                    // Ensure views is initialized
                    if (!video.views) {
                        const { data: updateData, error: updateError } = await window.supabaseClient
                            .from('videos')
                            .update({ views: 0 })
                            .eq('id', video.id)
                            .select()
                            .single();
                            
                        if (updateData) {
                            video.views = 0;
                        }
                    }

                    // Try to get the file from storage
                    const { data } = window.supabaseClient.storage
                        .from('videos')
                        .getPublicUrl(video.url);
                    
                    // Check if the file exists
                    const response = await fetch(data.publicUrl, { method: 'HEAD' });
                    if (response.ok) {
                        validVideos.push(video);
                    } else {
                        console.log('Video file not found in storage, removing from database:', video.id);
                        await window.supabaseClient
                            .from('videos')
                            .delete()
                            .eq('id', video.id);
                    }
                } catch (err) {
                    console.log('Error checking video file:', err);
                }
            }

            // Apply sorting
            if (sortBy === 'views') {
                validVideos.sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0));
            } else {
                validVideos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

    // Function to update view count
    async function incrementViewCount(video, viewCountElement) {
        try {
            // Get current views from database
            const { data: currentData, error: getError } = await window.supabaseClient
                .from('videos')
                .select('views')
                .eq('id', video.id)
                .single();

            if (getError) throw getError;

            // Calculate new view count
            const currentViews = parseInt(currentData.views || 0);
            const newViews = currentViews + 1;

            // Update view count in database
            const { data: updateData, error: updateError } = await window.supabaseClient
                .from('videos')
                .update({ views: newViews })
                .eq('id', video.id)
                .select()
                .single();

            if (updateError) throw updateError;

            // Update UI
            if (viewCountElement && updateData) {
                viewCountElement.textContent = updateData.views;
                video.views = updateData.views;
            }
        } catch (err) {
            console.error('Error updating view count:', err);
        }
    }

    // Modify the video event listener in displayVideos
    function addViewCountListener(videoElement, video, viewCountElement) {
        let viewCounted = false;
        videoElement.addEventListener('play', async () => {
            if (!viewCounted) {
                viewCounted = true;
                await incrementViewCount(video, viewCountElement);
            }
        });
    }

    async function displayVideos(videos) {
        const videoGrid = document.querySelector('.video-grid');
        videoGrid.innerHTML = '';

        // Filter out test videos with specific characteristics
        videos = videos.filter(video => {
            const isTestVideo = video.title === 'Test Video 1' || video.title === 'Test Video 2';
            const hasNullUser = !video.user_id || video.user_id === 'null';
            const hasFutureDate = new Date(video.created_at) > new Date();
            
            // Log problematic entries for debugging
            if (isTestVideo || hasNullUser || hasFutureDate) {
                console.log('Filtering out problematic video:', video);
                return false;
            }
            return true;
        });

        if (!videos || videos.length === 0) {
            videoGrid.innerHTML = `
                <div class="no-videos">
                    <i class="fas fa-video-slash"></i>
                    <p>No videos found</p>
                </div>
            `;
            return;
        }

        for (const video of videos) {
            try {
                const card = document.createElement('div');
                card.className = 'video-card';
                
                // Check if the video URL is valid
                let isValidVideo = true;
                let isImage = false;
                let publicUrl = '';
                
                try {
                    const { data } = window.supabaseClient.storage
                        .from('videos')
                        .getPublicUrl(video.url);
                    publicUrl = data.publicUrl;

                    // Try to determine if it's an image
                    if (video.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                        isImage = true;
                        isValidVideo = false;
                    } else {
                        // Check if it's a valid video
                        const response = await fetch(data.publicUrl, { method: 'HEAD' });
                        if (!response.ok) {
                            throw new Error('Content not accessible');
                        }
                    }
                } catch (urlErr) {
                    console.error('Error getting content URL:', urlErr);
                    isValidVideo = false;
                }

                // Show controls only for signed-in users
                const userControls = `
                    <div class="video-controls">
                        ${currentUser ? `
                            ${currentUser.id === video.user_id ? `
                                <button class="edit-btn" title="Edit video" data-video-id="${video.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-btn" title="Delete video" data-video-id="${video.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                            <button class="download-btn" title="Download video">
                                <i class="fas fa-download"></i>
                            </button>
                        ` : ''}
                    </div>
                `;

                card.innerHTML = `
                    <div class="video-header">
                        ${userControls}
                    </div>
                    ${isValidVideo ? `
                        <video controls width="100%" height="auto" preload="metadata">
                            <source src="${publicUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    ` : `
                        <div class="invalid-video">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>No video with supported format and MIME type found.</p>
                            ${currentUser && currentUser.id === video.user_id ? `
                                <button class="delete-btn" title="Delete video" data-video-id="${video.id}">
                                    <i class="fas fa-trash"></i> Delete this video
                                </button>
                            ` : ''}
                        </div>
                    `}
                    <div class="video-info">
                        <h3>${video.title || 'Untitled Entry'}</h3>
                        <p class="video-description">${video.description || 'No description available'}</p>
                        <div class="video-metadata">
                            <p><span class="view-count">${video.views || 0}</span> views</p>
                            ${currentUser && currentUser.id === video.user_id ? `
                                <button class="edit-description-btn" title="Edit description">
                                    <i class="fas fa-edit"></i> Edit Details
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;

                // Add edit functionality
                const editBtn = card.querySelector('.edit-btn, .edit-description-btn');
                if (editBtn && currentUser && currentUser.id === video.user_id) {
                    editBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const modal = document.createElement('div');
                        modal.className = 'modal';
                        modal.innerHTML = `
                            <div class="modal-content">
                                <h2>Edit Video Details</h2>
                                <form id="edit-form">
                                    <div class="form-group">
                                        <label for="video-title">Title</label>
                                        <input type="text" id="video-title" value="${video.title || ''}" placeholder="Video title" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="video-description">Description</label>
                                        <textarea id="video-description" placeholder="Add a description" rows="4">${video.description || ''}</textarea>
                                    </div>
                                    <div class="modal-buttons">
                                        <button type="submit" class="save-btn">Save Changes</button>
                                        <button type="button" class="cancel">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        `;
                        document.body.appendChild(modal);

                        const form = modal.querySelector('#edit-form');
                        form.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const newTitle = form.querySelector('#video-title').value.trim();
                            const newDescription = form.querySelector('#video-description').value.trim();

                            try {
                                showLoading(true);
                                const videoId = video.id;
                                console.log('Attempting to update video:', { videoId, newTitle, newDescription });

                                // First update the video
                                const { error: updateError } = await window.supabaseClient
                                    .from('videos')
                                    .update({ 
                                        title: newTitle || 'Untitled Entry',
                                        description: newDescription
                                    })
                                    .eq('id', videoId);

                                if (updateError) {
                                    console.error('Error updating video:', updateError);
                                    throw updateError;
                                }

                                // Then fetch the updated data
                                const { data: updatedVideo, error: fetchError } = await window.supabaseClient
                                    .from('videos')
                                    .select('*')
                                    .eq('id', videoId)
                                    .single();

                                if (fetchError) {
                                    console.error('Error fetching updated video:', fetchError);
                                    throw fetchError;
                                }

                                if (updatedVideo) {
                                    console.log('Successfully updated video:', updatedVideo);
                                    // Update the video object
                                    video.title = updatedVideo.title;
                                    video.description = updatedVideo.description;
                                    
                                    // Update the UI
                                    card.querySelector('h3').textContent = updatedVideo.title;
                                    const descriptionElement = card.querySelector('.video-description');
                                    if (descriptionElement) {
                                        descriptionElement.textContent = updatedVideo.description || 'No description available';
                                    }
                                    
                                    modal.remove();
                                    showError('Video details updated successfully');
                                } else {
                                    throw new Error('Failed to retrieve updated video details');
                                }
                            } catch (err) {
                                console.error('Error in video update:', err);
                                showError('Error updating video: ' + err.message);
                            } finally {
                                showLoading(false);
                            }
                        });

                        modal.querySelector('.cancel').addEventListener('click', () => modal.remove());
                        modal.addEventListener('click', (e) => {
                            if (e.target === modal) modal.remove();
                        });
                    });
                }

                // Add download functionality
                const downloadBtn = card.querySelector('.download-btn');
                if (downloadBtn && currentUser) {
                    downloadBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        try {
                            showLoading(true);
                            const response = await fetch(publicUrl);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = video.title || 'video';
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        } catch (err) {
                            console.error('Error downloading video:', err);
                            showError('Error downloading video: ' + err.message);
                        } finally {
                            showLoading(false);
                        }
                    });
                }

                // Add delete functionality for both regular and force-delete buttons
                const deleteButtons = card.querySelectorAll('.delete-btn, .force-delete-btn');
                deleteButtons.forEach(deleteBtn => {
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
                                const videoId = deleteBtn.dataset.videoId;
                                const forceDelete = deleteBtn.dataset.forceDelete === 'true';
                                
                                let success;
                                if (forceDelete) {
                                    success = await forceDeleteVideo(video);
                                } else {
                                    success = await deleteVideo(videoId);
                                }
                                
                                if (success) {
                                    card.remove();
                                }
                            }
                        });
                    }
                });

                // Add view count tracking
                const videoElement = card.querySelector('video');
                if (videoElement) {
                    let viewCounted = false;
                    videoElement.addEventListener('play', async () => {
                        if (!viewCounted) {
                            try {
                                // First update the view count directly
                                const { error: updateError } = await window.supabaseClient.rpc(
                                    'increment_view_count',
                                    { video_id: video.id }
                                );

                                if (updateError) {
                                    console.error('Error updating view count:', updateError);
                                    return;
                                }

                                // Then get the updated count
                                const { data: updatedVideo, error: getError } = await window.supabaseClient
                                    .from('videos')
                                    .select('views')
                                    .eq('id', video.id)
                                    .single();

                                if (getError) {
                                    console.error('Error getting updated view count:', getError);
                                    return;
                                }

                                // Update UI
                                if (updatedVideo) {
                                    const viewCountElement = card.querySelector('.view-count');
                                    if (viewCountElement) {
                                        viewCountElement.textContent = updatedVideo.views;
                                        video.views = updatedVideo.views;
                                        console.log(`View count updated to ${updatedVideo.views}`);
                                        viewCounted = true;
                                    }
                                }
                            } catch (err) {
                                console.error('Error in view count update:', err);
                            }
                        }
                    });
                }

                // Initialize view count display
                const viewCountElement = card.querySelector('.view-count');
                if (viewCountElement) {
                    viewCountElement.textContent = video.views || '0';
                    console.log(`Initialized view count for ${video.title}: ${video.views || 0}`);
                }

                videoGrid.appendChild(card);
            } catch (err) {
                console.error('Error displaying video:', err);
            }
        }
    }

    async function loadHomeVideos() {
        const videos = await loadVideos('recent');
        await displayVideos(videos);
    }

    async function loadExploreVideos() {
        try {
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*');
            
            if (error) throw error;
            
            // Shuffle the videos
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
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*')
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('views', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            await displayVideos(videos);
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
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            await displayVideos(videos);
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
            const { error: storageError } = await window.supabaseClient.storage
                .from('videos')
                .remove([video.url]);

            if (storageError) throw storageError;

            // Then delete from database
            const { error: dbError } = await window.supabaseClient
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (dbError) throw dbError;

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

    async function forceDeleteVideo(video) {
        try {
            showLoading(true);
            console.log('Attempting to force delete video:', video);
            
            // Delete from database first, without checking ownership
            const { error: dbError } = await window.supabaseClient
                .from('videos')
                .delete()
                .eq('id', video.id);

            if (dbError) {
                console.error('Database delete error:', dbError);
                // If the database delete fails, try a more aggressive approach
                try {
                    const { error: fallbackError } = await window.supabaseClient.rpc('force_delete_video', {
                        video_id: video.id
                    });
                    if (fallbackError) throw fallbackError;
                } catch (fallbackErr) {
                    console.error('Fallback delete error:', fallbackErr);
                    throw fallbackErr;
                }
            }

            // Try to delete from storage if URL exists
            if (video.url) {
                try {
                    await window.supabaseClient.storage
                        .from('videos')
                        .remove([video.url]);
                } catch (storageErr) {
                    console.error('Storage delete error:', storageErr);
                    // Continue even if storage delete fails
                }
            }

            showError('Video entry removed successfully');
            return true;
        } catch (err) {
            console.error('Error removing video entry:', err);
            showError(`Error removing video entry: ${err.message}`);
            return false;
        } finally {
            showLoading(false);
        }
    }

    // Add a function to clean up invalid entries
    async function cleanupInvalidEntries() {
        try {
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*')
                .eq('title', 'Test Video 1')
                .or('title.eq.Test Video 2');

            if (error) throw error;

            if (videos && videos.length > 0) {
                for (const video of videos) {
                    await forceDeleteVideo(video);
                }
                showError('Successfully cleaned up test videos');
                await loadHomeVideos(); // Refresh the video list
            }
        } catch (err) {
            console.error('Error cleaning up test videos:', err);
            showError('Error cleaning up test videos');
        }
    }

    // Call cleanup on page load
    cleanupInvalidEntries();
});