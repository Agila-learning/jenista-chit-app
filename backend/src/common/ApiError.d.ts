export declare class ApiError extends Error {
    statusCode: number;
    errorCode: string;
    errors?: any[];
    constructor(statusCode: number, message: string, errorCode?: string, errors?: any[]);
}
//# sourceMappingURL=ApiError.d.ts.map