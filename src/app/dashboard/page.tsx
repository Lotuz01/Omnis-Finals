import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconPlus, IconEye, IconFileText, IconCreditCard, IconTrendingUp, IconTrendingDown, IconUsers, IconPackage } from "@tabler/icons-react"
import Link from 'next/link';

interface UserData {
  id: number;
  username: string;
  name: string;
  isAdmin: boolean;
}

interface DashboardStats {
  totalProducts: number;
  totalMovements: number;
  totalAccounts: number;
  pendingAccounts: number;
}

// Server-side authentication function
async function getAuthenticatedUser(): Promise<UserData | null> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token');
  
  if (!authToken) {
    return null;
  }
  
  try {
    const username = authToken.value.includes('_') ? authToken.value.split('_')[0] : authToken.value;
    
    if (!username || username.trim().length === 0) {
      return null;
    }
    
    // Here you would typically validate the token against your database
    // For now, we'll do a basic validation
    const response = await fetch(`http://localhost:3000/api/user`, {
      headers: {
        'Cookie': `auth_token=${authToken.value}`
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Server-side stats fetching function
async function getDashboardStats(authToken: string): Promise<DashboardStats | null> {
  try {
    const [productsRes, movementsRes, accountsRes] = await Promise.all([
      fetch(`http://localhost:3000/api/products`, {
        headers: { 'Cookie': `auth_token=${authToken}` }
      }),
      fetch(`http://localhost:3000/api/movements`, {
        headers: { 'Cookie': `auth_token=${authToken}` }
      }),
      fetch(`http://localhost:3000/api/accounts`, {
        headers: { 'Cookie': `auth_token=${authToken}` }
      })
    ]);
    
    if (!productsRes.ok || !movementsRes.ok || !accountsRes.ok) {
      return null;
    }
    
    const [products, movements, accounts] = await Promise.all([
      productsRes.json(),
      movementsRes.json(),
      accountsRes.json()
    ]);
    
    return {
      totalProducts: products.length || 0,
      totalMovements: movements.length || 0,
      totalAccounts: accounts.length || 0,
      pendingAccounts: accounts.filter((acc: any) => acc.status === 'pending').length || 0
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      totalProducts: 0,
      totalMovements: 0,
      totalAccounts: 0,
      pendingAccounts: 0
    };
  }
}

export default async function Page() {
  // Server-side authentication
  const user = await getAuthenticatedUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // If user is admin, redirect to admin dashboard
  if (user.isAdmin) {
    redirect('/admin/dashboard');
  }
  
  // Get auth token for stats fetching
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token');
  const stats = authToken ? await getDashboardStats(authToken.value) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user.name || user.username}!
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Produtos
            </CardTitle>
            <IconPackage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Produtos cadastrados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Movimentações
            </CardTitle>
            <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMovements || 0}</div>
            <p className="text-xs text-muted-foreground">
              Entradas e saídas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contas Totais
            </CardTitle>
            <IconCreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAccounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Contas cadastradas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contas Pendentes
            </CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingAccounts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconPackage className="h-5 w-5" />
              Produtos
            </CardTitle>
            <CardDescription>
              Gerencie seu estoque de produtos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/products">
              <Button className="w-full" variant="outline">
                <IconEye className="mr-2 h-4 w-4" />
                Ver Produtos
              </Button>
            </Link>
            <Link href="/products/new">
              <Button className="w-full">
                <IconPlus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconTrendingUp className="h-5 w-5" />
              Movimentações
            </CardTitle>
            <CardDescription>
              Controle entradas e saídas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/movements">
              <Button className="w-full" variant="outline">
                <IconEye className="mr-2 h-4 w-4" />
                Ver Movimentações
              </Button>
            </Link>
            <Link href="/movements/new">
              <Button className="w-full">
                <IconPlus className="mr-2 h-4 w-4" />
                Nova Movimentação
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCreditCard className="h-5 w-5" />
              Contas
            </CardTitle>
            <CardDescription>
              Gerencie contas a pagar e receber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/accounts">
              <Button className="w-full" variant="outline">
                <IconEye className="mr-2 h-4 w-4" />
                Ver Contas
              </Button>
            </Link>
            <Link href="/accounts/new">
              <Button className="w-full">
                <IconPlus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
