// Validações para formulários

// Validação de CPF
export const validateCPF = (cpf) => {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

// Formatação de CPF
export const formatCPF = (cpf) => {
  if (!cpf) return '';
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Validação de email
export const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validação de telefone
export const validatePhone = (phone) => {
  if (!phone) return true; // Campo opcional
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

// Formatação de telefone
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
};

// Formatação de data
export const formatDate = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Validação de nome completo
export const validateFullName = (name) => {
  if (!name) return false;
  const trimmedName = name.trim();
  return trimmedName.length >= 3 && trimmedName.includes(' ');
};

// Validação de nome de guerra
export const validateNomeGuerra = (nomeGuerra) => {
  if (!nomeGuerra) return false;
  return nomeGuerra.trim().length >= 2;
};

// Validação de identidade militar
export const validateIdentidadeMilitar = (identidade) => {
  if (!identidade) return false;
  // Aceita apenas 5 dígitos
  const cleanIdentidade = identidade.replace(/\D/g, '');
  return cleanIdentidade.length === 5;
};

// Validação de data
export const validateDate = (date) => {
  if (!date) return true; // Campo opcional
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
};

// Validação de data de nascimento (deve ser no passado)
export const validateBirthDate = (date) => {
  if (!date) return true; // Campo opcional
  const dateObj = new Date(date);
  const today = new Date();
  return dateObj instanceof Date && !isNaN(dateObj) && dateObj < today;
};

// Validação de data de incorporação
export const validateIncorporationDate = (date) => {
  if (!date) return true; // Campo opcional
  const dateObj = new Date(date);
  const today = new Date();
  return dateObj instanceof Date && !isNaN(dateObj) && dateObj <= today;
};

// Validação completa do formulário de militar
export const validateMilitarForm = (formData) => {
  const errors = {};
  
  // Nome completo
  if (!validateFullName(formData.nome_completo)) {
    errors.nome_completo = 'Nome completo deve ter pelo menos 3 caracteres e incluir sobrenome';
  }
  
  // Nome de guerra
  if (!validateNomeGuerra(formData.nome_guerra)) {
    errors.nome_guerra = 'Nome de guerra deve ter pelo menos 2 caracteres';
  }
  
  // Posto/Graduação
  if (!formData.posto_graduacao) {
    errors.posto_graduacao = 'Posto/Graduação é obrigatório';
  }
  
  // CPF
  if (!validateCPF(formData.cpf)) {
    errors.cpf = 'CPF inválido';
  }
  
  // Identidade militar
  if (!validateIdentidadeMilitar(formData.identidade_militar)) {
    errors.identidade_militar = 'Identidade militar deve ter exatamente 5 dígitos';
  }
  
  // Email
  if (formData.email && !validateEmail(formData.email)) {
    errors.email = 'Email inválido';
  }
  
  // Telefone
  if (formData.telefone && !validatePhone(formData.telefone)) {
    errors.telefone = 'Telefone deve ter 10 ou 11 dígitos';
  }
  
  // Data de nascimento
  if (formData.data_nascimento && !validateBirthDate(formData.data_nascimento)) {
    errors.data_nascimento = 'Data de nascimento inválida';
  }
  
  // Data de incorporação
  if (formData.data_incorporacao && !validateIncorporationDate(formData.data_incorporacao)) {
    errors.data_incorporacao = 'Data de incorporação inválida';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Função para limpar e formatar dados antes do envio
export const sanitizeMilitarData = (formData) => {
  return {
    ...formData,
    nome_completo: formData.nome_completo?.trim(),
    nome_guerra: formData.nome_guerra?.trim(),
    cpf: formData.cpf?.replace(/\D/g, ''),
    identidade_militar: formData.identidade_militar?.trim(),
    email: formData.email?.trim().toLowerCase(),
    telefone: formData.telefone?.replace(/\D/g, ''),
    unidade: formData.unidade?.trim(),
    setor: formData.setor?.trim(),
    observacoes: formData.observacoes?.trim()
  };
};

// Validação de formulário de usuário
export const validateUsuarioForm = (formData) => {
  const errors = {};
  let isValid = true;

  // Validações obrigatórias
  if (!formData.nome_completo || !validateFullName(formData.nome_completo)) {
    errors.nome_completo = 'Nome completo é obrigatório e deve ter pelo menos 2 palavras';
    isValid = false;
  }

  if (!formData.email || !validateEmail(formData.email)) {
    errors.email = 'Email válido é obrigatório';
    isValid = false;
  }

  if (!formData.cpf || !validateCPF(formData.cpf)) {
    errors.cpf = 'CPF válido é obrigatório';
    isValid = false;
  }

  if (!formData.telefone || !validatePhone(formData.telefone)) {
    errors.telefone = 'Telefone válido é obrigatório';
    isValid = false;
  }

  if (!formData.data_nascimento || !validateBirthDate(formData.data_nascimento)) {
    errors.data_nascimento = 'Data de nascimento válida é obrigatória';
    isValid = false;
  }

  // Validações específicas para militares
  if (formData.tipo === 'militar') {
    if (!formData.posto_graduacao) {
      errors.posto_graduacao = 'Posto/Graduação é obrigatório para militares';
      isValid = false;
    }

    if (!formData.nome_guerra || !validateNomeGuerra(formData.nome_guerra)) {
      errors.nome_guerra = 'Nome de guerra é obrigatório para militares';
      isValid = false;
    }

    // Matrícula: aceitar somente números, 3–20 dígitos
    const validateMatricula = (v) => {
      if (!v) return false;
      const s = String(v).trim();
      return /^\d{3,20}$/.test(s);
    };
    if (!formData.matricula || !validateMatricula(formData.matricula)) {
      errors.matricula = 'Matrícula válida é obrigatória (somente números)';
      isValid = false;
    }

    if (!formData.data_incorporacao || !validateIncorporationDate(formData.data_incorporacao)) {
      errors.data_incorporacao = 'Data de incorporação válida é obrigatória para militares';
      isValid = false;
    }
  }

  // Validação de senha
  const hasSenhaInput = typeof formData.senha === 'string' && formData.senha.trim().length > 0;
  const hasConfirmInput = typeof formData.confirmar_senha === 'string' && formData.confirmar_senha.trim().length > 0;
  if (hasSenhaInput || hasConfirmInput) {
    if (!formData.senha || formData.senha.length < 6) {
      errors.senha = 'Senha deve ter pelo menos 6 caracteres';
      isValid = false;
    }

    if (formData.senha !== formData.confirmar_senha) {
      errors.confirmar_senha = 'Senhas não coincidem';
      isValid = false;
    }
  }

  // Validação de IDs obrigatórios
  // Unidades de acesso (membros_unidade)
  if (!Array.isArray(formData.unidades_ids) || formData.unidades_ids.length === 0) {
    errors.unidades_ids = 'Selecione pelo menos uma unidade de acesso';
    isValid = false;
  }
  // Unidade de lotação (usuarios.unidade_lotacao_id)
  if (!formData.unidade_lotacao_id) {
    errors.unidade_lotacao_id = 'Unidade de lotação é obrigatória';
    isValid = false;
  }
  // Regra de consistência: lotação deve estar entre as unidades selecionadas
  if (formData.unidade_lotacao_id && Array.isArray(formData.unidades_ids) && formData.unidades_ids.length > 0) {
    const ids = formData.unidades_ids.map(String);
    if (!ids.includes(String(formData.unidade_lotacao_id))) {
      errors.unidade_lotacao_id = 'Lotação deve estar entre as Unidades selecionadas';
      isValid = false;
    }
  }

  if (!formData.perfil_id) {
    errors.perfil_id = 'Perfil é obrigatório';
    isValid = false;
  }

  return { isValid, errors };
};

// Sanitização de dados de usuário
export const sanitizeUsuarioData = (formData) => {
  const sanitized = { ...formData };
  
  // Remove campos de confirmação
  delete sanitized.confirmar_senha;
  
  // Formata campos
  if (sanitized.cpf) {
    sanitized.cpf = sanitized.cpf.replace(/\D/g, '');
  }
  
  if (sanitized.telefone) {
    sanitized.telefone = sanitized.telefone.replace(/\D/g, '');
  }
  // Normaliza matrícula para números
  if (sanitized.matricula) {
    sanitized.matricula = String(sanitized.matricula).replace(/\D/g, '');
  }
  
  // Remove campos vazios ou nulos
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === null || sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  
  // Normaliza funcoes (array de strings) e prioriza sobre funcao_id
  if (Array.isArray(sanitized.funcoes)) {
    sanitized.funcoes = sanitized.funcoes
      .map(f => typeof f === 'string' ? f.trim() : '')
      .filter(Boolean);

    if (sanitized.funcoes.length > 0) {
      delete sanitized.funcao_id;
    }
  }
  
  // Remove campos específicos de militares se o tipo for civil
  if (sanitized.tipo === 'civil') {
    delete sanitized.posto_graduacao;
    delete sanitized.nome_guerra;
    delete sanitized.matricula;
    delete sanitized.data_incorporacao;
  }
  
  return sanitized;
};