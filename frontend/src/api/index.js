// Export all API services
export * from "./config";
import * as authService from "./authService";
import * as userService from "./userService";
import * as productService from "./productService";
import * as saleService from "./saleService";
import * as orderService from "./orderService";
import * as reportService from "./reportService";
import * as performanceService from "./performanceService";

export {
  authService,
  userService,
  productService,
  saleService,
  orderService,
  reportService,
  performanceService,
};
