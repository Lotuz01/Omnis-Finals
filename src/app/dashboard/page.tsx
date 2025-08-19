'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  CreditCard,
  FileText,
  ArrowRight,
  Plus,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Activity {
  type: string;
  value?: string | number;
  created_at: string;
  description?: string;
}

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalMovements: 0,
    totalAccounts: 0,
    pendingAccounts: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/user/stats', {
          signal: abortController.signal
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Erro ao buscar estatísticas:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/user/activities', {
          signal: abortController.signal
        });
        if (response.ok) {
          const data = await response.json();
          setActivities(data);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Erro ao buscar atividades:', error);
        }
      } finally {
        setActivitiesLoading(false);
      }
    };

    fetchStats();
    fetchActivities();
    
    return () => {
      abortController.abort();
    };
  }, []);

  // Estatísticas baseadas nos dados reais
  const statsCards = [
    {
      title: 'Produtos',
      value: loading ? '...' : stats.totalProducts.toString(),
      change: '+0',
      trend: 'up' as const,
      icon: Package,
      color: 'text-blue-600'
    },
    {
      title: 'Movimentações',
      value: loading ? '...' : stats.totalMovements.toString(),
      change: '+0',
      trend: 'up' as const,
      icon: FileText,
      color: 'text-green-600'
    },
    {
      title: 'Contas',
      value: loading ? '...' : stats.totalAccounts.toString(),
      change: '+0',
      trend: 'up' as const,
      icon: CreditCard,
      color: 'text-purple-600'
    },
    {
      title: 'Contas Pendentes',
      value: loading ? '...' : stats.pendingAccounts.toString(),
      change: '0',
      trend: 'down' as const,
      icon: CreditCard,
      color: 'text-orange-600'
    }
  ];

  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} h atrás`;
    return `${Math.floor(diffInMinutes / 1440)} dias atrás`;
  };

  const getActivityStatus = (type: string) => {
    switch (type) {
      case 'product': return 'info';
      case 'movement': return 'success';
      case 'account': return 'warning';
      default: return 'info';
    }
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.type) {
      case 'product': return `Produto ${activity.name} cadastrado`;
      case 'movement': return `Movimentação: ${activity.name}`;
      case 'account': return `Conta: ${activity.name}`;
      default: return activity.name;
    }
  };

  const quickActions = [
    {
      title: 'Nova Venda',
      description: 'Registrar uma nova venda',
      href: '/products',
      icon: Plus,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Cadastrar Produto',
      description: 'Adicionar novo produto',
      href: '/products',
      icon: Package,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Novo Cliente',
      description: 'Cadastrar novo cliente',
      href: '/clients',
      icon: Users,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Ver Relatórios',
      description: 'Visualizar relatórios',
      href: '/movements',
      icon: FileText,
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Visão geral do seu negócio
          </p>
        </div>
        <Button asChild>
          <Link href="/products">
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendIcon className={`mr-1 h-3 w-3 ${
                    stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                    {stat.change}
                  </span>
                  <span className="ml-1">cadastrados</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              <CardDescription className="text-sm">
                Acesse rapidamente as funcionalidades principais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                
                return (
                  <Link
                    key={index}
                    href={action.href}
                    className="flex items-center space-x-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className={`rounded-md p-2 text-white ${action.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Atividades Recentes</CardTitle>
              <CardDescription className="text-sm">
                Últimas movimentações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activitiesLoading ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Carregando atividades...</p>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Nenhuma atividade encontrada</p>
                  </div>
                ) : (
                  activities.map((activity, index) => (
                    <div key={index}>
                      <div className="flex items-center space-x-4">
                        <div className={`rounded-full px-2 py-1 text-xs font-medium ${
                          getStatusColor(getActivityStatus(activity.type))
                        }`}>
                          {activity.type}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {getActivityDescription(activity)}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-primary">
                              {activity.value || '-'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatActivityTime(activity.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {index < activities.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/movements">
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Todas as Atividades
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Vendas dos Últimos 7 Dias</CardTitle>
            <CardDescription className="text-sm">
              Gráfico de vendas diárias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="mx-auto h-10 w-10 mb-3" />
                <p className="text-sm">Gráfico de vendas será implementado aqui</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Produtos Mais Vendidos</CardTitle>
            <CardDescription className="text-sm">
              Top 5 produtos do mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Package className="mx-auto h-10 w-10 mb-3" />
                <p className="text-sm">Ranking de produtos será implementado aqui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
