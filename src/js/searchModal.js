/* eslint-disable max-lines-per-function */
import {
  MAX_RENDER_VIDEOS_COUNT,
  LOCAL_STORAGE_VIDEO_LIST_KEY,
  VALIDATION_ERROR_NAME,
} from './constants/constant';
import VideoItem from './videoItem';
import checkVideoListFull from './validation/validators';
import ValidationError from './validation/validation-error';
import { consoleErrorWithConditionalAlert, arrayToMap, $ } from './utils';

class SearchModal {
  serverUrl = 'https://silly-volhard-192918.netlify.app/.netlify/functions/youtube';

  nextPageToken = null;

  init() {
    this.$modal = $('.search-modal');
    this.$searchKeyWordInput = $('#search-input-keyword', this.$modal);
    this.$searchButton = $('#search-button', this.$modal);
    this.$searchResult = $('.search-result');
    this.$videoList = $('.video-list', this.$searchResult);
    this.renderSkeletonItems(MAX_RENDER_VIDEOS_COUNT);

    this.$searchButton.addEventListener('click', this.handleClickSearchButton);
    this.$videoList.addEventListener('click', this.handleClickVideoList);
    this.$videoList.addEventListener('scroll', this.handleScrollVideoList);

    const videoList = this.getVideoListFromLocalStorage();
    this.savedVideoMap = arrayToMap(videoList);
  }

  templateSkeletons(videoCount) {
    const skeletonListHtmlString = [...Array(videoCount).keys()]
      .map(
        () => `
          <div class="skeleton">
            <div class="image"></div>
            <p class="line"></p>
            <p class="line"></p>
          </div>
        `
      )
      .join('');
    return skeletonListHtmlString;
  }

  renderSkeletonItems(videoCount) {
    this.$videoList.insertAdjacentHTML('beforeend', this.templateSkeletons(videoCount)); // 그냥 더해도 CSS로 처음에 안보이게 해놨다
  }

  renderVideoItems(videos) {
    const videoListTemplate = videos
      .map(video => {
        const isSavedVideo = Object.prototype.hasOwnProperty.call(this.savedVideoMap, video.id);
        const button = !isSavedVideo
          ? '<button class="video-item__save-button button">⬇ 저장</button>'
          : '';
        return `<li class="video-item" data-video-id="${video.id}">
          <img
            src="${video.thumbnailUrl}"
            alt="video-item-thumbnail" class="video-item__thumbnail" />
          <h4 class="video-item__title">${video.title}</h4>
          <p class="video-item__channel-name">${video.channelTitle}</p>
          <p class="video-item__published-date">${video.publishedAt}</p>
          ${button}
        </li>`;
      })
      .join('');
    const $firstSkeleton = this.$videoList.querySelector('.skeleton');
    $firstSkeleton.insertAdjacentHTML('beforebegin', videoListTemplate);
  }

  checkSearchResult(searchResult) {
    if (searchResult === null) {
      return [];
    }
    const videos = searchResult.items.map(item => new VideoItem(item));
    return videos;
  }

  handleClickSearchButton = async () => {
    this.resetSearchResult();
    this.nextPageToken = null; // 같은 검색어로 또 검색했을때 첫페이지가 보여지도록 한다
    const searchKeyWord = this.$searchKeyWordInput.value;
    const searchResult = await this.requestYoutubeVideos(searchKeyWord);
    if (searchResult === null) {
      this.$searchResult.classList.add('search-result--no-result');
      return;
    }
    const videos = this.checkSearchResult(searchResult);
    this.renderVideoItems(videos);
    this.nextPageToken = searchResult.nextPageToken;
  };

  handleScrollVideoList = async () => {
    const title = this.$searchKeyWordInput.value;
    const isScrollEnd =
      this.$videoList.scrollHeight - this.$videoList.scrollTop === this.$videoList.clientHeight;

    if (
      isScrollEnd &&
      this.$videoList.scrollTop !== 0 &&
      !this.$searchResult.classList.contains('loading') &&
      this.nextPageToken !== null
    ) {
      const jsonResult = await this.requestYoutubeVideos(title);
      if (jsonResult === null) {
        return;
      }
      this.nextPageToken = jsonResult.nextPageToken;
      const videos = jsonResult.items.map(item => new VideoItem(item));
      this.renderVideoItems(videos);
    }
  };

  handleClickSaveButton = event => {
    const { target } = event;
    const $videoItem = target.closest('.video-item');
    const videoId = $videoItem.getAttribute('data-video-id');
    try {
      this.saveVideo(videoId);
      target.setAttribute('hidden', true);
    } catch (error) {
      consoleErrorWithConditionalAlert(error, VALIDATION_ERROR_NAME);
    }
  };

  handleClickVideoList = event => {
    const { target } = event;
    if (target.classList.contains('video-item__save-button')) {
      this.handleClickSaveButton(event);
    }
  };

  saveVideo(videoId) {
    const videoList = this.getVideoListFromLocalStorage();
    const { hasError, errorMessage } = checkVideoListFull(videoList);
    if (hasError) {
      throw new ValidationError(errorMessage);
    }
    const newVideoList = [...videoList, videoId];
    this.savedVideoMap = arrayToMap(newVideoList);
    this.saveVideoListToLocalStorage(newVideoList);
  }

  resetSearchResult() {
    this.$videoList.replaceChildren(); // 내용물을 모두 비워준다
    this.renderSkeletonItems(MAX_RENDER_VIDEOS_COUNT); // skeleton을 다시 그려준다
    this.$searchResult.classList.remove('search-result--no-result'); // 결과 없음 class를 삭제한다
  }

  removeSkeleton() {
    [...this.$videoList.querySelectorAll('.skeleton')].forEach($el => $el.remove());
  }

  async requestYoutubeVideos(query) {
    this.$searchResult.classList.add('loading');
    try {
      const url = new URL(this.serverUrl);
      const parameters = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        maxResults: MAX_RENDER_VIDEOS_COUNT,
        regionCode: 'kr',
        safeSearch: 'strict',
        pageToken: this.nextPageToken ?? '',
        q: query,
      });
      url.search = parameters.toString();

      const response = await fetch(url);
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error.message);
      }
      return body;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      this.$searchResult.classList.remove('loading');
    }
  }

  getVideoListFromLocalStorage() {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_VIDEO_LIST_KEY)) ?? [];
  }

  saveVideoListToLocalStorage(videoList) {
    localStorage.setItem(LOCAL_STORAGE_VIDEO_LIST_KEY, JSON.stringify(videoList));
  }
}

export default SearchModal;