export interface ITokenPayload {
  id: string;
  role: string;
  isActive?: boolean;

  iat?: number;
  exp?: number;
}
