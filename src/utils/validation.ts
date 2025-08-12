// Sistema de validação robusto para APIs

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'cnpj' | 'cpf' | 'phone' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class Validator {
  private static instance: Validator;
  
  public static getInstance(): Validator {
    if (!Validator.instance) {
      Validator.instance = new Validator();
    }
    return Validator.instance;
  }

  // Validar CNPJ
  private validateCNPJ(cnpj: string): boolean {
    cnpj = cnpj.replace(/[^\d]/g, '');
    
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    
    let sum = 0;
    let weight = 2;
    
    for (let i = 11; i >= 0; i--) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cnpj[12]) !== digit1) return false;
    
    sum = 0;
    weight = 2;
    
    for (let i = 12; i >= 0; i--) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return parseInt(cnpj[13]) === digit2;
  }

  // Validar CPF
  private validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(cpf[9]) !== digit1) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return parseInt(cpf[10]) === digit2;
  }

  // Validar email
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validar telefone
  private validatePhone(phone: string): boolean {
    const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
    return phoneRegex.test(phone);
  }

  // Validar data
  private validateDate(date: string): boolean {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  // Validar um campo individual
  private validateField(value: any, rule: ValidationRule, fieldName: string): ValidationError | null {
    // Verificar se é obrigatório
    if (rule.required && (value === undefined || value === null || value === '')) {
      return { field: fieldName, message: `${fieldName} é obrigatório` };
    }

    // Se não é obrigatório e está vazio, não validar outros critérios
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // Validar tipo
    if (rule.type) {
      switch (rule.type) {
        case 'string':
          if (typeof value !== 'string') {
            return { field: fieldName, message: `${fieldName} deve ser uma string` };
          }
          break;
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            return { field: fieldName, message: `${fieldName} deve ser um número` };
          }
          value = Number(value);
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            return { field: fieldName, message: `${fieldName} deve ser um boolean` };
          }
          break;
        case 'email':
          if (!this.validateEmail(value)) {
            return { field: fieldName, message: `${fieldName} deve ser um email válido` };
          }
          break;
        case 'cnpj':
          if (!this.validateCNPJ(value)) {
            return { field: fieldName, message: `${fieldName} deve ser um CNPJ válido` };
          }
          break;
        case 'cpf':
          if (!this.validateCPF(value)) {
            return { field: fieldName, message: `${fieldName} deve ser um CPF válido` };
          }
          break;
        case 'phone':
          if (!this.validatePhone(value)) {
            return { field: fieldName, message: `${fieldName} deve ser um telefone válido` };
          }
          break;
        case 'date':
          if (!this.validateDate(value)) {
            return { field: fieldName, message: `${fieldName} deve ser uma data válida` };
          }
          break;
      }
    }

    // Validar comprimento mínimo
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return { field: fieldName, message: `${fieldName} deve ter pelo menos ${rule.minLength} caracteres` };
    }

    // Validar comprimento máximo
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return { field: fieldName, message: `${fieldName} deve ter no máximo ${rule.maxLength} caracteres` };
    }

    // Validar valor mínimo
    if (rule.min !== undefined && Number(value) < rule.min) {
      return { field: fieldName, message: `${fieldName} deve ser pelo menos ${rule.min}` };
    }

    // Validar valor máximo
    if (rule.max !== undefined && Number(value) > rule.max) {
      return { field: fieldName, message: `${fieldName} deve ser no máximo ${rule.max}` };
    }

    // Validar padrão regex
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return { field: fieldName, message: `${fieldName} não atende ao formato esperado` };
    }

    // Validação customizada
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        return { 
          field: fieldName, 
          message: typeof customResult === 'string' ? customResult : `${fieldName} é inválido` 
        };
      }
    }

    return null;
  }

  // Validar objeto completo
  public validate(data: any, schema: ValidationSchema): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [fieldName, rule] of Object.entries(schema)) {
      const error = this.validateField(data[fieldName], rule, fieldName);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  // Sanitizar dados de entrada
  public sanitize(data: any, schema: ValidationSchema): any {
    const sanitized: any = {};

    for (const [fieldName, rule] of Object.entries(schema)) {
      let value = data[fieldName];

      if (value !== undefined && value !== null) {
        // Converter tipos
        if (rule.type === 'number') {
          value = Number(value);
        } else if (rule.type === 'boolean') {
          value = Boolean(value);
        } else if (rule.type === 'string') {
          value = String(value).trim();
        }

        // Remover caracteres especiais para CNPJ/CPF
        if (rule.type === 'cnpj' || rule.type === 'cpf') {
          value = value.replace(/[^\d]/g, '');
        }

        sanitized[fieldName] = value;
      }
    }

    return sanitized;
  }
}

// Schemas de validação pré-definidos
export const schemas = {
  user: {
    username: { required: true, type: 'string' as const, minLength: 3, maxLength: 50 },
    password: { required: true, type: 'string' as const, minLength: 6 },
    name: { required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
    isAdmin: { type: 'boolean' as const }
  },
  
  product: {
    name: { required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
    description: { type: 'string' as const, maxLength: 500 },
    price: { required: true, type: 'number' as const, min: 0 },
    stock: { required: true, type: 'number' as const, min: 0 }
  },
  
  client: {
    company_name: { required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
    cnpj: { required: true, type: 'cnpj' as const },
    email: { type: 'email' as const },
    phone: { type: 'phone' as const },
    address: { type: 'string' as const, maxLength: 200 },
    city: { type: 'string' as const, maxLength: 100 },
    state: { type: 'string' as const, minLength: 2, maxLength: 2 },
    zip_code: { type: 'string' as const, pattern: /^\d{5}-?\d{3}$/ }
  },
  
  account: {
    type: { required: true, type: 'string' as const, custom: (value: string) => ['pagar', 'receber'].includes(value) },
    description: { required: true, type: 'string' as const, minLength: 3, maxLength: 200 },
    amount: { required: true, type: 'number' as const, min: 0.01 },
    due_date: { required: true, type: 'date' as const },
    category: { type: 'string' as const, maxLength: 50 },
    supplier_customer: { type: 'string' as const, maxLength: 100 },
    notes: { type: 'string' as const, maxLength: 500 }
  },
  
  printer: {
    name: { required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
    type: { required: true, type: 'string' as const, custom: (value: string) => ['termica', 'matricial', 'laser', 'jato_tinta'].includes(value) },
    connection_type: { required: true, type: 'string' as const, custom: (value: string) => ['usb', 'rede', 'serial', 'bluetooth'].includes(value) },
    paper_width: { required: true, type: 'number' as const, min: 1 },
    is_default: { type: 'boolean' as const },
    is_active: { type: 'boolean' as const }
  }
};

// Instância singleton
export const validator = Validator.getInstance();

// Middleware para validação em APIs Next.js
export function withValidation(schema: ValidationSchema) {
  return function <T extends (...args: any[]) => any>(handler: T): T {
    return (async (request: Request, ...args: any[]) => {
      try {
        const body = await request.json();
        
        // Sanitizar dados
        const sanitizedData = validator.sanitize(body, schema);
        
        // Validar dados
        const errors = validator.validate(sanitizedData, schema);
        
        if (errors.length > 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Dados inválidos', 
              details: errors 
            }), 
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Adicionar dados sanitizados à requisição
        (request as any).validatedData = sanitizedData;
        
        return handler(request, ...args);
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao processar dados' }), 
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    }) as T;
  };
}