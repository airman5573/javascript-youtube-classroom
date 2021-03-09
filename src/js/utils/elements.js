import { $ } from "./dom.js";

const elements = {
  $body: $("body"),
  $searchButton: $("#search-button"),
  $searchModal: $("#search-modal"),
  $searchModalClose: $("#search-modal-close"),
  $searchForm: $("#search-form"),
  $searchResults: $("#search-results"),
  $searchResultsInner: $("#search-results-inner"),
  $hiddenTarget: $("#hidden-target"),
  $skeletonSearchResults: $("#skeleton-search-results"),
  $skeletonUIContainer: $("#skeleton-ui-container"),
  $notFound: $("#not-found"),
  $keywordHistory: $("#keyword-history"),
  $savedVideoCount: $("#saved-video-count"),
};

export default elements;
