import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import api from './api';
import { getLongestPath } from './utils/get-longest-path';

const FETCH_PROJECTS_DONE = 'fetch-projects-done';
const PROJECT_SELECTED = 'project-selected';
const STATS_LOADING_START = 'stats-loading-start';

const initialState = {
  projects: [],
  tasksLength: null,
  depsLength: null,
  rootCount: null,
  longestPath: null,
  statsLoading: false,
  selectedProjectId: null,
};

function reducer(state=initialState, action) {
  switch (action.type) {

    case FETCH_PROJECTS_DONE:
      return {
        ...state,
        projects: action.payload.data,
      }

    case STATS_LOADING_START:
      return {
        ...state,
        statsLoading: true,
      }

    case PROJECT_SELECTED: {
      const { tasksLength, depsLength, rootCount, longestPath, selectedProjectId } = action.payload.data;

      return {
        ...state,
        tasksLength,
        depsLength,
        rootCount,
        longestPath,
        selectedProjectId,
        statsLoading: false,
      };
    }

    default:
      return state;
  }
}

const middlewares = [
  thunk,
];

export const store = createStore(reducer, applyMiddleware(...middlewares));

export function fetchProjects() {
  return async dispatch => {
    const projects = await api.fetchProjects();

    dispatch({
      type: FETCH_PROJECTS_DONE,
      payload: {
        data: projects,
      }
    });
  }
}

function getRootCount(tasks, deps, attrs) {
  const [_, nextNode] = attrs; // eslint-disable-line
  const roots = {};
  tasks.forEach(t => roots[t.id] = true);
  deps.forEach(d => {
    delete roots[d[nextNode]];
  });
  return Object.keys(roots).length;
}


export function selectProject(projectId) {
  return async dispatch => {
    dispatch({
      type: STATS_LOADING_START,
    });
    const formattedAttrs = {
      dependUnique: ['depend_unique_id', 'task_unique_id'],
      predSuc: ['predecessor_id', 'successor_id'],
    };

    const tasks = await api.fetchTasks(projectId);
    const deps = await api.fetchDependencies(projectId);

    const depDataFormat = deps[0] && deps[0].hasOwnProperty('task_unique_id') ? 'dependUnique' : 'predSuc'; // eslint-disable-line

    const rootCount = getRootCount(tasks, deps, formattedAttrs[depDataFormat]);
    const longestPath = getLongestPath(tasks, deps, formattedAttrs[depDataFormat]);

    dispatch({
      type: PROJECT_SELECTED,
      payload: {
        data: {
          tasksLength: tasks.length,
          depsLength: deps.length,
          rootCount,
          longestPath,
          selectedProjectId: projectId,
        },
      }
    });
  }
}