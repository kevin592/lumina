/**
 * Search Store
 *
 * 负责搜索功能，包括：
 * - 全局搜索
 * - 搜索结果
 */

import { makeAutoObservable } from 'mobx';

export interface SearchResults {
  notes: any[];
  resources: any[];
  settings: any[];
}

export class SearchStore {
  sid = 'SearchStore';

  // 全局搜索词
  globalSearchTerm: string = '';

  // 全局搜索是否打开
  isGlobalSearchOpen: boolean = false;

  // 搜索结果
  searchResults: SearchResults = {
    notes: [],
    resources: [],
    settings: []
  };

  constructor() {
    makeAutoObservable(this);
  }

  // 设置全局搜索词
  setGlobalSearchTerm(term: string) {
    this.globalSearchTerm = term;
  }

  // 打开全局搜索
  openGlobalSearch() {
    this.isGlobalSearchOpen = true;
  }

  // 关闭全局搜索
  closeGlobalSearch() {
    this.isGlobalSearchOpen = false;
    this.globalSearchTerm = '';
    this.searchResults = {
      notes: [],
      resources: [],
      settings: []
    };
  }

  // 设置搜索结果
  setSearchResults(results: SearchResults) {
    this.searchResults = results;
  }

  // 清空搜索结果
  clearSearchResults() {
    this.searchResults = {
      notes: [],
      resources: [],
      settings: []
    };
  }

  // 是否有搜索结果
  get hasResults(): boolean {
    return (
      this.searchResults.notes.length > 0 ||
      this.searchResults.resources.length > 0 ||
      this.searchResults.settings.length > 0
    );
  }

  // 搜索结果总数
  get resultCount(): number {
    return (
      this.searchResults.notes.length +
      this.searchResults.resources.length +
      this.searchResults.settings.length
    );
  }
}
