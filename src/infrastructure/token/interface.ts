export interface ITokenPayload {
  id: string;
  role: string;      // keyin Roles enum qilamiz
  isActive?: boolean;

  iat?: number;
  exp?: number;
}
