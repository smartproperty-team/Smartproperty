"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppService = class AppService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    getHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: this.configService.get('app.nodeEnv') || 'development',
            version: '1.0.0',
        };
    }
    getApiInfo() {
        const port = this.configService.get('app.port') || 3000;
        const baseUrl = `http://localhost:${port}`;
        return {
            name: this.configService.get('app.name') || 'SmartProperty API',
            version: '1.0.0',
            description: 'Property Management and Rental Matching Platform API',
            documentation: `${baseUrl}/api/docs`,
            environment: this.configService.get('app.nodeEnv') || 'development',
            endpoints: {
                health: `${baseUrl}/api/health`,
                docs: `${baseUrl}/api/docs`,
                graphql: `${baseUrl}/graphql`,
            },
        };
    }
};
AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppService);
exports.AppService = AppService;
//# sourceMappingURL=app.service.js.map