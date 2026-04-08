import { db } from "../../core/database";
import { cache } from "../../infra/redis";
import { logger } from "../../shared/logging";
import { config } from "../../config/app";
import { UserModel } from "../../models/user";
import { OrderModel } from "../../models/order";
import { PaymentService } from "../../services/payment";
import { NotificationService } from "../../services/notification";
import { AnalyticsService } from "../../services/analytics";
import { AuditLog } from "../../shared/audit";

declare var globalState: any;
declare var window: any;

export function processCheckout(userId: string) {
  const user = UserModel.findById(userId);
  const orders = OrderModel.findByUser(userId);
  globalState.currentUser = user;
  PaymentService.charge(user, orders);
  NotificationService.send(user, "checkout");
  AnalyticsService.track("checkout", { userId });
  AuditLog.write("checkout", userId);
  window.__lastCheckout = Date.now();
  cache.set(`user:${userId}`, user);
  logger.info("checkout done");
  return db.save(orders);
}
