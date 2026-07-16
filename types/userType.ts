export interface User {
  id: number;
  username: string;
  name: string;
  isActive: boolean;
  departmentId: number;
  roles: {name: string;}[];
  permissions: {name: string;}[];
  email: string;
}
