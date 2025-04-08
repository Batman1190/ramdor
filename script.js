// Add interactivity and video loading logic here
document.addEventListener('DOMContentLoaded', async () => {
    // Authentication handling
    const loginBtn = document.querySelector('.login-btn');
    const uploadBtn = document.querySelector('.upload-btn');
    let currentUser = null; // Add this to track user state
    
    try {
        // Check if user is logged in
        const { data, error } = await window.supabaseClient.auth.getSession();
        currentUser = data?.session?.user;

        if (currentUser) {
            loginBtn.textContent = 'Sign Out';
            uploadBtn.style.display = 'block';
        } else {
            loginBtn.textContent = 'Sign In';
            uploadBtn.style.display = 'none';
            uploadBtn.addEventListener('click', () => {
                alert('Please sign in to upload videos');
            });
        }
    } catch (err) {
        console.error('Error checking auth status:', err);
    }

    // Update login handler to use currentUser
    // Login/Logout handling
    loginBtn.addEventListener('click', async () => {
        try {
            console.log('Login button clicked');
            if (!window.supabaseClient) {
                console.error('Supabase not initialized');
                return;
            }
            
            if (currentUser) {
                console.log('Signing out...');
                await window.supabaseClient.auth.signOut();
                window.location.reload();
            } else {
                console.log('Starting Google sign in...');
                const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: 'http://127.0.0.1:5500',
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent'
                        }
                    }
                });
                
                console.log('Immediate response:', { data, error });
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Login error: ' + err.message);
        }
    });

    // Upload handling
    uploadBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Please sign in to upload videos');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            console.log('Starting upload for:', file.name);
            const fileName = `${Date.now()}-${file.name}`;
            
            try {
                console.log('Uploading to storage...');
                // Upload to Supabase Storage
                const { data, error } = await window.supabaseClient.storage
                    .from('videos')
                    .upload(`${currentUser.id}/${fileName}`, file, {
                        upsert: false
                    });
                    
                if (error) {
                    console.error('Storage upload error:', error);
                    alert(`Error uploading video: ${error.message}`);
                    return;
                }

                console.log('Storage upload successful, saving to database...');
                // Use user_id instead of owner_id
                const { data: videoData, error: dbError } = await window.supabaseClient
                    .from('videos')
                    .insert([{
                        title: file.name,
                        url: `${currentUser.id}/${fileName}`,
                        user_id: currentUser.id,
                        views: 0
                    }])
                    .select();
        
                if (dbError) {
                    console.error('Database error:', dbError);
                    alert(`Error saving video metadata: ${dbError.message}`);
                    return;
                }
        
                alert('Video uploaded successfully!');
                loadVideos();
            } catch (err) {
                console.error('Upload error:', err);
                alert(`Upload error: ${err.message}`);
            }
        };
        
        input.click();
    });

    // Load videos from Supabase
    async function loadVideos() {
        const { data: videos, error } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading videos:', error);
            return;
        }

        const videoGrid = document.querySelector('.video-grid');
        videoGrid.innerHTML = ''; // Clear existing videos

        videos.forEach(video => {
            const card = createVideoCard({
                thumbnail: `${SUPABASE_URL}/storage/v1/object/public/videos/${video.url}`,
                title: video.title,
                author: video.user_id, // You might want to fetch user details separately
                views: '0 views', // Implement view counting if needed
                timestamp: new Date(video.created_at).toLocaleDateString()
            });
            videoGrid.appendChild(card);
        });
    }

    // Initial video load
    loadVideos();

    // Sample video data
    const videos = [
        {
            thumbnail: 'video1.jpg',
            title: 'Amazing Adventure in Nature',
            author: 'Nature Explorer',
            views: '1.2M views',
            timestamp: '2 days ago'
        },
        // Add more video objects here
    ];

    // Function to create video cards
    function createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <img src="${video.thumbnail}" alt="${video.title}">
            <div class="video-info">
                <h3>${video.title}</h3>
                <p>${video.author}</p>
                <p>${video.views} • ${video.timestamp}</p>
            </div>
        `;
        return card;
    }

    // Populate video grid
    const videoGrid = document.querySelector('.video-grid');
    videos.forEach(video => {
        videoGrid.appendChild(createVideoCard(video));
    });

    // Toggle between grid and feed view
    const viewToggle = document.createElement('button');
    viewToggle.id = 'view-toggle';
    viewToggle.innerHTML = '<i class="fas fa-toggle-on"></i>';
    document.querySelector('.nav-right').prepend(viewToggle);

    viewToggle.addEventListener('click', () => {
        const videoGrid = document.querySelector('.video-grid');
        const tiktokFeed = document.querySelector('.tiktok-style-feed');
        
        if (videoGrid.style.display !== 'none') {
            videoGrid.style.display = 'none';
            tiktokFeed.style.display = 'block';
        } else {
            videoGrid.style.display = 'grid';
            tiktokFeed.style.display = 'none';
        }
    });
});