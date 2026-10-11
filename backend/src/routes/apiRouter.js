import * as accessController from '../controllers/accessController.js';
import * as adminController from '../controllers/adminController.js';
import * as cardController from '../controllers/cardController.js';
import * as healthController from '../controllers/healthController.js';
import * as logController from '../controllers/logController.js';
import * as passController from '../controllers/passController.js';
import * as userController from '../controllers/userController.js';
import * as adminAuthService from '../services/adminAuthService.js';
import { AppError, fromError } from '../utils/response.js';

function adminOnly(authHeader, handler) {
  adminAuthService.requireAdmin(authHeader);
  return handler();
}

export function dispatchApi(req) {
  const { method, pathname, searchParams, headers, body } = req;
  const authHeader = headers.authorization;

  try {
    if (method === 'GET' && pathname === '/api/health') {
      return { statusCode: 200, body: healthController.health() };
    }

    if (method === 'POST' && pathname === '/api/access/scan') {
      return { statusCode: 200, body: accessController.scan(body) };
    }

    if (method === 'POST' && pathname === '/api/admin/login') {
      return { statusCode: 200, body: adminController.login(body) };
    }

    if (method === 'POST' && pathname === '/api/admin/logout') {
      return { statusCode: 200, body: adminController.logout(authHeader) };
    }

    if (method === 'GET' && pathname === '/api/admin/me') {
      return { statusCode: 200, body: adminController.me(authHeader) };
    }

    if (method === 'GET' && pathname === '/api/users') {
      return {
        statusCode: 200,
        body: adminOnly(authHeader, () => userController.list(searchParams)),
      };
    }

    if (method === 'GET' && pathname === '/api/cards') {
      return {
        statusCode: 200,
        body: adminOnly(authHeader, () => cardController.list(searchParams)),
      };
    }

    if (method === 'POST' && pathname === '/api/cards') {
      return {
        statusCode: 201,
        body: adminOnly(authHeader, () => cardController.create(body)),
      };
    }

    const cardActiveMatch = pathname.match(/^\/api\/cards\/(\d+)\/active$/);
    if (method === 'PATCH' && cardActiveMatch) {
      return {
        statusCode: 200,
        body: adminOnly(authHeader, () => cardController.patchActive(cardActiveMatch[1], body)),
      };
    }

    if (method === 'GET' && pathname === '/api/access-logs') {
      return {
        statusCode: 200,
        body: adminOnly(authHeader, () => logController.list(searchParams)),
      };
    }

    if (method === 'GET' && pathname === '/api/passes/active') {
      return {
        statusCode: 200,
        body: adminOnly(authHeader, () => passController.listActive(searchParams)),
      };
    }

    throw new AppError(404, 'NOT_FOUND', 'Route not found');
  } catch (err) {
    return fromError(err);
  }
}
