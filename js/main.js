// Options
var CLIENT_ID = 'YOUR_CLIENT_ID';
var DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'];
var SCOPES = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtubepartner https://www.googleapis.com/auth/youtube.force-ssl';

(function($, window, document) {
    "use strict";
    $(function() {
        //##Variables
        var $body = $('body'),
            $selectedVideo = {},
            $authorizeButton = $('#authorize-button'),
            $signoutButton = $('#signout-button'),
            $pages = $('#pages'),
            $videoContainer = $('#video-container'),
            $loader = $('.container-loader'),
            $tabButton = $('.tab__button'),
            $window = $(window),
            $doc = $(document),
            defaultEasing = [0.4, 0.0, 0.2, 1];
        //End Variables

        // Load auth2 library
        function handleClientLoad() {
            $loader.addClass('is--loading');
            gapi.load('client:auth2', initClient);
        }

        // Init API client library and set up sign in listeners
        function initClient() {
            gapi.client
            .init({
                discoveryDocs: DISCOVERY_DOCS,
                clientId: CLIENT_ID,
                scope: SCOPES
            })
            .then(() => {
                // Listen for sign in state changes
                gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
                // Handle initial sign in state
                updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                // Handle login
                $authorizeButton.on('click',function(e){
                    gapi.auth2.getAuthInstance().signIn();
                })
                // Handle logout
                $signoutButton.on('click',function(e){
                    gapi.auth2.getAuthInstance().signOut();
                })
            });
            $loader.removeClass('is--loading');
        }

        // Update UI sign in state changes
        function updateSigninStatus(isSignedIn) {
            if (isSignedIn) {
                $body.addClass('is--signed-in');
                getChannel();
            } else {
                $body.removeClass('is--signed-in');
            }
        }

        // Get channel from API
        function getChannel(pageToken = undefined) {
            gapi.client.youtube.channels
            .list({
                part: 'snippet,contentDetails,statistics',
                // forUsername: 'google',
                mine: true
            })
            .then(response => {
                var channel = response.result.items[0];
                var playlistId = channel.contentDetails.relatedPlaylists.uploads;
                requestVideoPlaylist(playlistId, pageToken);
            })
            .catch(err => alert('No Channel By That Name'));
        }

        function requestVideoPlaylist(playlistId, pageToken = undefined) {
            $loader.addClass('is--loading');
            var requestOptions = {
                playlistId: playlistId,
                part: 'snippet',
                maxResults: 9,
                pageToken: pageToken
            };

            var request = gapi.client.youtube.playlistItems.list(requestOptions);

            request.execute(response => {
                var playListItems = response.result.items;
                var pageInfo = response.result.pageInfo;
                var prevPageToken = response.result.prevPageToken;
                var nextPageToken = response.result.nextPageToken;
                if (playListItems) {
                    var output = '';

                    // Loop through videos and append output
                    playListItems.forEach(item => {
                        var videoId = item.snippet.resourceId.videoId;
                        var thumbnail = item.snippet.thumbnails.medium;
                        var title = item.snippet.title;
                        // <iframe width="100%" height="auto" src="https://www.youtube.com/embed/" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                        output += `
                            <div class="column-4 column-tab-6 column-mob-6">
                                <div class="yt-item" data-video-id="${videoId}" data-thumbnail="${thumbnail.url}" data-title="${title}">
                                    <img src="${thumbnail.url}" alt="${title}"/>
                                    <h6>${title}</h6>
                                </div>
                            </div>
                        `;
                    });

                    // Output videos
                    $videoContainer.html(output);
                    var page= '';
                    if (prevPageToken) {
                        page += '<span id="prev-page" class="loadmore" data-playlistId="'+playlistId+'" data-page="'+prevPageToken+'">Prev Page</span>';
                    }
                    if(nextPageToken){
                        page += '<span id="next-page" class="loadmore" data-playlistId="'+playlistId+'" data-page="'+nextPageToken+'">Next Page</span>';
                    }
                    $pages.html(page);
                } else {
                    $videoContainer.html('No Uploaded Videos');
                }
                $loader.removeClass('is--loading');
            });
        }

        function handleFileSelect(evt) {
            var files = evt.target.files;
            var f = files[0];

            var reader = new FileReader();
            var fileData = null;
            reader.onload = (function(theFile) {
                return function(e) {
                    var uploadVideo = new UploadVideo();
                    uploadVideo.ready(gapi.client.getToken().access_token);
                };
            })(f);
          
            // Read in the image file as a data URL.
            reader.readAsDataURL(f);
        }

        $window.on('load', function(e){
            $tabButton.on('click', function(e){
                e.preventDefault();
                if ($(this).hasClass("is--active")) {
                    return;
                }
                $(this).siblings("a").removeClass("is--active");
                $(this).parent().parent().find(".tabs__item.is--active").removeClass("is--active");
                var $className = $(this).attr("class").split(" ")[1];
                $(this).addClass("is--active");
                $(this).parent().parent().find("." + $className).addClass("is--active");
            })
            $('#submitButton').on('click', function(e){
                e.preventDefault();
                //Validate
                if($('#title').val() === ''){
                    $('#title').addClass('errorField');
                    $('.error').html('Title of video is required');
                    return;
                }
                if($('#description').val() === ''){
                    $('#description').addClass('errorField');
                    $('.error').html('Description of video is required');
                    return;
                }
                if($('#file').val() === ''){
                    $('.fileLable').addClass('errorField');
                    $('.error').html('Please select video to upload');
                    return;
                }
                //fetch videos again
            })
            $(document).on("click", '#loadmore', function(e) {
                getChannel(e.target.getAttribute('data-page'))
            });
            $('#addVideo').on("click", function(e) {
                $('#iframe').html(`<iframe width="300" height="250" src="https://www.youtube.com/embed/${$selectedVideo.id}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`);
            });
            $(document).on("click", '.yt-item', function(e) {
                $('.yt-item.is--selected').removeClass('is--selected');
                $(this).addClass('is--selected');
                $selectedVideo = {
                    id: $(this).attr('data-video-id'),
                    title: $(this).attr('data-title'), 
                    thumbnail: $(this).attr('data-thumbnail') 
                } 
                console.log($selectedVideo);
            });
            $(document).on("change", '#file', function(e) {
                handleFileSelect(e);
            });
            handleClientLoad();
        })
    });
}(window.jQuery, window, document));
