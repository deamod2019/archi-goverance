// Mock data for architecture governance system
const MOCK = {
    domains: [
        { id: 'retail', name: '零售银行', code: 'DOM-RETAIL', description: '面向个人客户的全渠道零售金融服务，涵盖信用卡、消费贷款、个人存款、财富管理等业务线。', owner: '张副行长', architect: '李建国', status: 'ACTIVE', createdDate: '2020-01-01', lastReviewDate: '2025-12-15', apps: 42, systems: 6, compliance: 92, color: '#6366f1', health: 'good', bizGoal: '2026年零售AUM突破5000亿', priority: 'P0' },
        { id: 'corp', name: '对公银行', code: 'DOM-CORP', description: '面向企业客户的综合金融服务，包括核心银行、支付清算、贸易融资、现金管理等。', owner: '王副行长', architect: '赵明', status: 'ACTIVE', createdDate: '2020-01-01', lastReviewDate: '2025-11-20', apps: 28, systems: 4, compliance: 88, color: '#3b82f6', health: 'good', bizGoal: '对公存款同比增长15%', priority: 'P0' },
        { id: 'risk', name: '风险管理', code: 'DOM-RISK', description: '全行风险管控体系，包含实时风控引擎、合规管理、反欺诈系统等。', owner: '陈副行长（CRO）', architect: '周伟', status: 'ACTIVE', createdDate: '2020-03-01', lastReviewDate: '2026-01-10', apps: 15, systems: 3, compliance: 95, color: '#10b981', health: 'good', bizGoal: '风控模型覆盖率达到98%', priority: 'P0' },
        { id: 'market', name: '金融市场', code: 'DOM-MARKET', description: '金融市场交易、市场风险管理和结算业务线。', owner: '刘副行长', architect: '吴强', status: 'ACTIVE', createdDate: '2020-06-01', lastReviewDate: '2025-09-05', apps: 18, systems: 3, compliance: 85, color: '#f59e0b', health: 'warn', bizGoal: '交易系统延迟降至5ms以下', priority: 'P1' },
        { id: 'platform', name: '科技平台', code: 'DOM-PLATFORM', description: '全行公共技术平台，提供API网关、DevOps、监控、消息中间件、统一认证等基础能力。', owner: 'CTO办公室', architect: '孙磊', status: 'ACTIVE', createdDate: '2019-06-01', lastReviewDate: '2026-02-01', apps: 35, systems: 5, compliance: 90, color: '#06b6d4', health: 'good', bizGoal: '平台化能力覆盖率达到85%', priority: 'P0' },
        { id: 'data', name: '数据中台', code: 'DOM-DATA', description: '全行数据资产管理平台，涵盖数据湖、BI报表、数据治理和AI平台。', owner: 'CDO办公室', architect: '钱峰', status: 'ACTIVE', createdDate: '2021-01-01', lastReviewDate: '2025-12-20', apps: 22, systems: 4, compliance: 93, color: '#a855f7', health: 'good', bizGoal: '数据资产目录覆盖率90%', priority: 'P1' },
        { id: 'mgmt', name: '经营管理', code: 'DOM-MGMT', description: '内部经营管理支撑系统，包括OA协同和人力资源管理。', owner: '综合管理部', architect: '郑伟', status: 'ACTIVE', createdDate: '2020-01-01', lastReviewDate: '2025-06-15', apps: 12, systems: 2, compliance: 78, color: '#ec4899', health: 'warn', bizGoal: '全流程线上化率达95%', priority: 'P2' }
    ],
    systems: {
        retail: [
            { id: 'credit-card', name: '信用卡系统', code: 'SYS-CC', level: 'CORE', status: 'RUNNING', classification: 'A', securityLevel: 'S2', dataLevel: 'L3', tags: ['核心交易', '7×24', '双活部署'], description: '信用卡全生命周期管理系统，涵盖申请、审批、账务、风控、授权等环节。', owner: '信用卡事业部', architect: '李明', team: '信用卡开发组', teamSize: 25, techStack: 'Java 17 / Spring Boot 3.x / MySQL 8.0', createdDate: '2018-03-15', lastDeployDate: '2026-02-10', apps: 8, subsystems: 3, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' },
            { id: 'loan', name: '贷款系统', code: 'SYS-LOAN', level: 'CORE', status: 'RUNNING', classification: 'A', securityLevel: 'S2', dataLevel: 'L3', tags: ['核心交易', '合规敏感'], description: '个人消费贷款、经营贷款的申请、审批、放款、还款全流程管理。', owner: '贷款事业部', architect: '王芳', team: '信贷开发组', teamSize: 18, techStack: 'Java 17 / Spring Boot 3.x / MySQL 8.0', createdDate: '2019-01-10', lastDeployDate: '2026-02-08', apps: 6, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' },
            { id: 'deposit', name: '存款系统', code: 'SYS-DEP', level: 'CORE', status: 'RUNNING', classification: 'A', securityLevel: 'S2', dataLevel: 'L3', tags: ['核心交易', '客户数据'], description: '个人存款账户管理、定期/活期产品、利率计算等。', owner: '零售运营部', architect: '张伟', team: '存款开发组', teamSize: 12, techStack: 'Java 17 / Spring Boot 3.x / Oracle', createdDate: '2017-06-01', lastDeployDate: '2026-01-25', apps: 5, subsystems: 2, deployMode: '虚拟机+容器化', dataCenters: '新DC+灾备DC' },
            { id: 'channel', name: '渠道系统', code: 'SYS-CH', level: 'IMPORTANT', status: 'RUNNING', classification: 'B', securityLevel: 'S2', dataLevel: 'L2', tags: ['互联网暴露', '高并发', 'CDN加速'], description: '手机银行、网上银行、微信银行等全渠道接入系统。', owner: '数字渠道部', architect: '陈思', team: '渠道开发组', teamSize: 30, techStack: 'Java 17 / Vue 3 / Spring Boot 3.x', createdDate: '2018-09-01', lastDeployDate: '2026-02-11', apps: 10, subsystems: 3, deployMode: '容器化(K8S)', dataCenters: '新DC+扩展DC' },
            { id: 'crm', name: 'CRM系统', code: 'SYS-CRM', level: 'IMPORTANT', status: 'RUNNING', classification: 'B', securityLevel: 'S1', dataLevel: 'L2', tags: ['客户数据', '营销平台'], description: '客户关系管理系统，包括客户画像、营销活动、客户服务等。', owner: '零售营销部', architect: '刘洋', team: 'CRM开发组', teamSize: 15, techStack: 'Java 17 / React 18 / Spring Boot 3.x', createdDate: '2020-03-01', lastDeployDate: '2026-02-05', apps: 7, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' },
            { id: 'wealth', name: '财富管理', code: 'SYS-WM', level: 'GENERAL', status: 'BUILDING', classification: 'C', securityLevel: 'S1', dataLevel: 'L2', tags: ['新建系统', 'AI赋能'], description: '理财产品管理、智能投顾、基金/保险代销平台。', owner: '财富管理部', architect: '杨华', team: '财富管理组', teamSize: 10, techStack: 'Java 17 / Vue 3 / Python 3.11', createdDate: '2025-06-01', lastDeployDate: '2026-02-01', apps: 6, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC' }
        ],
        corp: [
            { id: 'core-bank', name: '核心银行系统', code: 'SYS-CORE', level: 'CORE', status: 'RUNNING', description: '全行核心账务处理系统，承载存贷、清算、总账等核心业务逻辑。', owner: '运营管理部', architect: '刘强', team: '核心开发组', teamSize: 40, techStack: 'Java 8→17迁移中 / Oracle RAC', createdDate: '2015-01-01', lastDeployDate: '2026-02-09', apps: 12, subsystems: 3, deployMode: '虚拟机', dataCenters: '新DC+灾备DC' },
            { id: 'payment', name: '支付清算系统', code: 'SYS-PAY', level: 'CORE', status: 'RUNNING', description: '银行间支付清算、大小额转账、跨境支付等。', owner: '结算部', architect: '周伟', team: '支付开发组', teamSize: 20, techStack: 'Java 17 / Spring Boot 3.x / MySQL 8.0', createdDate: '2017-09-01', lastDeployDate: '2026-02-07', apps: 6, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' },
            { id: 'trade-fin', name: '贸易融资', code: 'SYS-TF', level: 'IMPORTANT', status: 'RUNNING', description: '信用证、保函、供应链融资等贸易金融产品。', owner: '贸金部', architect: '李华', team: '对公开发组', teamSize: 12, techStack: 'Java 17 / Spring Boot 3.x', createdDate: '2019-06-01', lastDeployDate: '2026-01-20', apps: 5, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' },
            { id: 'cash-mgmt', name: '现金管理', code: 'SYS-CM', level: 'IMPORTANT', status: 'RUNNING', description: '企业现金池、资金归集、银企直连等现金管理服务。', owner: '交易银行部', architect: '赵阳', team: '对公开发组', teamSize: 8, techStack: 'Java 17 / Spring Boot 3.x', createdDate: '2020-09-01', lastDeployDate: '2026-01-15', apps: 5, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' }
        ],
        risk: [
            { id: 'risk-engine', name: '风控引擎', code: 'SYS-RE', level: 'CORE', status: 'RUNNING', description: '实时风控决策引擎，支持规则引擎和ML模型的联合决策。', owner: '风险管理部', architect: '赵刚', team: '风控开发组', teamSize: 22, techStack: 'Java 17 / Python 3.11 / Flink', createdDate: '2019-01-15', lastDeployDate: '2026-02-10', apps: 6, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' },
            { id: 'compliance-sys', name: '合规管理', code: 'SYS-COMP', level: 'IMPORTANT', status: 'RUNNING', description: '监管报送、反洗钱、合规检查等合规管理功能。', owner: '合规部', architect: '张丽', team: '合规开发组', teamSize: 10, techStack: 'Java 17 / Spring Boot 3.x', createdDate: '2020-06-01', lastDeployDate: '2026-01-28', apps: 5, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' },
            { id: 'anti-fraud', name: '反欺诈系统', code: 'SYS-AF', level: 'IMPORTANT', status: 'RUNNING', description: '交易反欺诈、身份欺诈检测、设备指纹等反欺诈能力。', owner: '风险管理部', architect: '赵刚', team: '反欺诈组', teamSize: 8, techStack: 'Java 17 / Python 3.11 / Kafka', createdDate: '2021-03-01', lastDeployDate: '2026-02-06', apps: 4, subsystems: 1, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' }
        ],
        market: [
            { id: 'trading', name: '交易系统', code: 'SYS-TRADE', level: 'CORE', status: 'RUNNING', description: '外汇、债券、衍生品等金融市场交易系统。', owner: '金融市场部', architect: '吴强', team: '金市开发组', teamSize: 25, techStack: 'Java 17 / C++ / Low-latency框架', createdDate: '2018-01-01', lastDeployDate: '2026-02-09', apps: 8, subsystems: 3, deployMode: '物理机+容器化', dataCenters: '新DC+灾备DC' },
            { id: 'risk-calc', name: '市场风险', code: 'SYS-MR', level: 'IMPORTANT', status: 'RUNNING', description: '市场风险计量（VaR、Greeks）及限额管理。', owner: '金融市场部', architect: '吴强', team: '金市开发组', teamSize: 8, techStack: 'Python 3.11 / Java 17', createdDate: '2020-01-01', lastDeployDate: '2026-01-30', apps: 5, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' },
            { id: 'settlement', name: '结算系统', code: 'SYS-SET', level: 'IMPORTANT', status: 'RUNNING', description: '金融市场交易的清算和结算处理。', owner: '结算部', architect: '李华', team: '金市开发组', teamSize: 6, techStack: 'Java 17 / Spring Boot 3.x', createdDate: '2019-03-01', lastDeployDate: '2026-01-22', apps: 5, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' }
        ],
        platform: [
            { id: 'gateway-sys', name: 'API网关平台', code: 'SYS-GW', level: 'CORE', status: 'RUNNING', description: '全行统一API网关，提供流量管控、认证鉴权、限流熔断等能力。', owner: '架构部', architect: '孙磊', team: '平台开发组', teamSize: 8, techStack: 'Go 1.21 / Envoy', createdDate: '2020-01-01', lastDeployDate: '2026-02-11', apps: 4, subsystems: 1, deployMode: '容器化(K8S)', dataCenters: '新DC+扩展DC+灾备DC' },
            { id: 'devops', name: 'DevOps平台', code: 'SYS-DEVOPS', level: 'IMPORTANT', status: 'RUNNING', description: 'CI/CD流水线、制品管理、环境管理等DevOps工具链。', owner: '架构部', architect: '孙磊', team: '平台开发组', teamSize: 15, techStack: 'Java 17 / Vue 3 / GitLab', createdDate: '2019-09-01', lastDeployDate: '2026-02-10', apps: 8, subsystems: 3, deployMode: '容器化(K8S)', dataCenters: '新DC' },
            { id: 'monitor', name: '监控平台', code: 'SYS-MON', level: 'IMPORTANT', status: 'RUNNING', description: '全行应用/基础设施监控，基于OTel+Prometheus+Grafana。', owner: '运维部', architect: '孙磊', team: '运维开发组', teamSize: 10, techStack: 'Go 1.21 / Java 17 / Prometheus', createdDate: '2019-06-01', lastDeployDate: '2026-02-08', apps: 6, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+扩展DC' },
            { id: 'mq-platform', name: '消息平台', code: 'SYS-MQ', level: 'IMPORTANT', status: 'RUNNING', description: '统一消息中间件平台，提供RocketMQ/Kafka/RabbitMQ集群管理。', owner: '架构部', architect: '孙磊', team: '中间件组', teamSize: 6, techStack: 'Java 17 / RocketMQ 5.x', createdDate: '2020-06-01', lastDeployDate: '2026-02-05', apps: 5, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' },
            { id: 'auth', name: '统一认证', code: 'SYS-AUTH', level: 'CORE', status: 'RUNNING', description: '全行统一身份认证与权限管理，支持OAuth2/OIDC/SAML。', owner: '信息安全部', architect: '孙磊', team: '平台开发组', teamSize: 8, techStack: 'Java 17 / Spring Security / Redis', createdDate: '2019-01-01', lastDeployDate: '2026-02-03', apps: 12, subsystems: 3, deployMode: '容器化(K8S)', dataCenters: '新DC+灾备DC' }
        ],
        data: [
            { id: 'data-lake', name: '数据湖', code: 'SYS-DL', level: 'IMPORTANT', status: 'RUNNING', description: '全行数据湖平台，统一存储和计算引擎。', owner: 'CDO办公室', architect: '钱峰', team: '数据开发组', teamSize: 20, techStack: 'Spark / Flink / ClickHouse', createdDate: '2021-06-01', lastDeployDate: '2026-02-09', apps: 8, subsystems: 3, deployMode: '容器化(K8S)', dataCenters: '新DC' },
            { id: 'bi', name: 'BI报表系统', code: 'SYS-BI', level: 'GENERAL', status: 'RUNNING', description: '管理层报表、业务分析看板等BI能力。', owner: 'CDO办公室', architect: '钱峰', team: '数据开发组', teamSize: 8, techStack: 'Java 17 / Vue 3 / ClickHouse', createdDate: '2022-01-01', lastDeployDate: '2026-01-28', apps: 5, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC' },
            { id: 'data-gov', name: '数据治理', code: 'SYS-DG', level: 'IMPORTANT', status: 'RUNNING', description: '数据资产目录、元数据管理、数据质量管控等。', owner: 'CDO办公室', architect: '钱峰', team: '数据治理组', teamSize: 6, techStack: 'Java 17 / Spring Boot 3.x / Neo4j', createdDate: '2022-06-01', lastDeployDate: '2026-01-20', apps: 5, subsystems: 2, deployMode: '容器化(K8S)', dataCenters: '新DC' },
            { id: 'ai-platform', name: 'AI平台', code: 'SYS-AI', level: 'GENERAL', status: 'BUILDING', description: 'AI/ML模型训练、推理服务、特征平台等AI基础设施。', owner: 'CDO办公室', architect: '钱峰', team: 'AI团队', teamSize: 12, techStack: 'Python 3.11 / PyTorch / K8S', createdDate: '2024-01-01', lastDeployDate: '2026-02-06', apps: 4, subsystems: 2, deployMode: 'GPU集群(K8S)', dataCenters: '新DC' }
        ],
        mgmt: [
            { id: 'oaoffice', name: 'OA系统', code: 'SYS-OA', level: 'GENERAL', status: 'RUNNING', description: '办公自动化系统，包括流程审批、公文管理、会议管理等。', owner: '综合管理部', architect: '郑伟', team: '管理支撑组', teamSize: 6, techStack: 'Java 8 / Spring MVC 4.x', createdDate: '2016-01-01', lastDeployDate: '2025-12-15', apps: 6, subsystems: 2, deployMode: '虚拟机', dataCenters: '扩展DC' },
            { id: 'hr', name: '人力资源', code: 'SYS-HR', level: 'GENERAL', status: 'RUNNING', description: '人事管理、薪酬核算、绩效考核、培训管理等。', owner: '人力资源部', architect: '郑伟', team: '管理支撑组', teamSize: 4, techStack: 'Java 8 / Spring MVC 4.x', createdDate: '2017-01-01', lastDeployDate: '2025-11-20', apps: 6, subsystems: 2, deployMode: '虚拟机', dataCenters: '扩展DC' }
        ]
    },
    // Subsystems: keyed by system id
    subsystems: {
        'credit-card': [
            { id: 'cc-apply', name: '信用卡申请子系统', code: 'SUB-CC-APPLY', classification: 'A', securityLevel: 'S2', tags: ['进件流程', 'OCR识别'], description: '信用卡在线申请、进件、审批流程管理。', owner: '李明', team: 'Team A', techStack: 'Java 17 / Spring Boot 3.x / MySQL', status: 'RUNNING', createdDate: '2018-03-15', apps: 3 },
            { id: 'cc-account', name: '信用卡账务子系统', code: 'SUB-CC-ACCT', classification: 'A', securityLevel: 'S2', tags: ['核心账务', '批量处理'], description: '信用卡出账、还款、利息计算、账单生成等账务处理。', owner: '王芳', team: 'Team B', techStack: 'Java 17 / Spring Boot 3.x / Oracle', status: 'RUNNING', createdDate: '2018-03-15', apps: 3 },
            { id: 'cc-risk', name: '信用卡风控子系统', code: 'SUB-CC-RISK', classification: 'A', securityLevel: 'S3', tags: ['实时决策', 'ML模型'], description: '交易授权、实时风控评分、反欺诈检测等。', owner: '赵刚', team: 'Team C', techStack: 'Java 17 / Flink / Redis', status: 'RUNNING', createdDate: '2019-06-01', apps: 2 }
        ],
        'loan': [
            { id: 'loan-origination', name: '贷款发起子系统', code: 'SUB-LOAN-ORIG', description: '贷款申请、材料审核、风险评估、审批决策。', owner: '王芳', team: '信贷A组', techStack: 'Java 17 / Spring Boot 3.x', status: 'RUNNING', createdDate: '2019-01-10', apps: 3 },
            { id: 'loan-servicing', name: '贷款管理子系统', code: 'SUB-LOAN-SVC', description: '放款、还款、逾期管理、贷后监控。', owner: '王芳', team: '信贷B组', techStack: 'Java 17 / Spring Boot 3.x', status: 'RUNNING', createdDate: '2019-01-10', apps: 3 }
        ],
        'deposit': [
            { id: 'dep-account', name: '账户管理子系统', code: 'SUB-DEP-ACCT', description: '存款账户开户、销户、冻结、信息维护等。', owner: '张伟', team: '存款A组', techStack: 'Java 17 / Oracle', status: 'RUNNING', createdDate: '2017-06-01', apps: 3 },
            { id: 'dep-product', name: '存款产品子系统', code: 'SUB-DEP-PROD', description: '定期/活期/大额存单产品配置与利率管理。', owner: '张伟', team: '存款B组', techStack: 'Java 17 / Oracle', status: 'RUNNING', createdDate: '2017-06-01', apps: 2 }
        ],
        'channel': [
            { id: 'ch-mobile', name: '手机银行子系统', code: 'SUB-CH-MB', description: '手机银行App和H5渠道。', owner: '陈思', team: '渠道A组', techStack: 'Vue 3 / Java 17', status: 'RUNNING', createdDate: '2018-09-01', apps: 4 },
            { id: 'ch-web', name: '网上银行子系统', code: 'SUB-CH-WEB', description: '网上银行PC端和企业银行。', owner: '陈思', team: '渠道B组', techStack: 'Vue 3 / Java 17', status: 'RUNNING', createdDate: '2018-09-01', apps: 3 },
            { id: 'ch-wechat', name: '微信银行子系统', code: 'SUB-CH-WX', description: '微信公众号/小程序渠道。', owner: '陈思', team: '渠道C组', techStack: 'Vue 3 / Java 17', status: 'RUNNING', createdDate: '2020-01-01', apps: 3 }
        ],
        'crm': [
            { id: 'crm-profile', name: '客户画像子系统', code: 'SUB-CRM-PROF', description: '客户基本信息、标签体系、360°客户视图。', owner: '刘洋', team: 'CRM-A组', techStack: 'Java 17 / Elasticsearch', status: 'RUNNING', createdDate: '2020-03-01', apps: 4 },
            { id: 'crm-campaign', name: '营销活动子系统', code: 'SUB-CRM-CAMP', description: '营销活动创建、投放、效果监测。', owner: '刘洋', team: 'CRM-B组', techStack: 'Java 17 / React 18', status: 'RUNNING', createdDate: '2020-06-01', apps: 3 }
        ],
        'wealth': [
            { id: 'wm-product', name: '理财产品子系统', code: 'SUB-WM-PROD', description: '理财产品上架、管理、净值计算。', owner: '杨华', team: '财富A组', techStack: 'Java 17 / Vue 3', status: 'BUILDING', createdDate: '2025-06-01', apps: 3 },
            { id: 'wm-advisor', name: '智能投顾子系统', code: 'SUB-WM-ADV', description: 'AI驱动的投资组合推荐引擎。', owner: '杨华', team: '财富B组', techStack: 'Python 3.11 / Java 17', status: 'BUILDING', createdDate: '2025-09-01', apps: 3 }
        ]
    },
    // Apps keyed by subsystem id
    apps: {
        'cc-apply': [
            { id: 'card-apply-svc', name: '信用卡申请服务', type: 'MICROSERVICE', status: 'RUNNING', classification: 'A', securityLevel: 'S2', tags: ['REST API', '进件'], owner: '李明', gitRepo: 'git@bank.com:retail/card-apply-svc.git' },
            { id: 'card-apply-web', name: '信用卡申请前端', type: 'SPA', status: 'RUNNING', classification: 'B', securityLevel: 'S1', tags: ['H5', 'Vue3'], owner: '李明', gitRepo: 'git@bank.com:retail/card-apply-web.git' },
            { id: 'card-apply-batch', name: '信用卡申请批处理', type: 'BATCH', status: 'RUNNING', classification: 'B', securityLevel: 'S1', tags: ['定时任务', 'ETL'], owner: '李明', gitRepo: 'git@bank.com:retail/card-apply-batch.git' }
        ],
        'cc-account': [
            { id: 'card-billing', name: '信用卡账务', type: 'MONOLITH', status: 'RUNNING', classification: 'A', securityLevel: 'S2', tags: ['核心账务', '事务一致'], owner: '王芳', gitRepo: 'git@bank.com:retail/card-billing.git' },
            { id: 'card-batch', name: '信用卡批量', type: 'BATCH', status: 'RUNNING', classification: 'B', securityLevel: 'S1', tags: ['批量出账', '月结'], owner: '王芳', gitRepo: 'git@bank.com:retail/card-batch.git' },
            { id: 'card-report', name: '信用卡报表', type: 'BATCH', status: 'RUNNING', classification: 'C', securityLevel: 'S1', tags: ['BI报表'], owner: '陈思', gitRepo: 'git@bank.com:retail/card-report.git' }
        ],
        'cc-risk': [
            { id: 'card-risk', name: '信用卡风控', type: 'MICROSERVICE', status: 'RUNNING', classification: 'A', securityLevel: 'S3', tags: ['实时风控', 'ML推理'], owner: '赵刚', gitRepo: 'git@bank.com:retail/card-risk.git' },
            { id: 'card-auth', name: '信用卡授权', type: 'MICROSERVICE', status: 'RUNNING', classification: 'A', securityLevel: 'S3', tags: ['交易授权', '毫秒级'], owner: '赵刚', gitRepo: 'git@bank.com:retail/card-auth.git' }
        ]
    },
    dependencies: [
        { source: 'card-apply-svc', target: 'card-risk', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'card-apply-svc', target: 'card-auth', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'card-apply-svc', target: 'card-notify', type: 'ASYNC_MQ', crit: 'LOW' },
        { source: 'card-billing', target: 'core-bank-svc', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'card-risk', target: 'risk-engine-svc', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'card-apply-web', target: 'card-apply-svc', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'card-report', target: 'card-billing', type: 'DB_SHARE', crit: 'MEDIUM' },
        { source: 'loan-svc', target: 'risk-engine-svc', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'loan-svc', target: 'core-bank-svc', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'channel-app', target: 'card-apply-svc', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'channel-app', target: 'loan-svc', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'channel-app', target: 'deposit-svc', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'crm-svc', target: 'card-apply-svc', type: 'SYNC_API', crit: 'MEDIUM' },
        { source: 'payment-svc', target: 'core-bank-svc', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'gateway-svc', target: 'channel-app', type: 'SYNC_API', crit: 'HIGH' },
        { source: 'monitor-svc', target: 'gateway-svc', type: 'ASYNC_MQ', crit: 'LOW' },
        { source: 'data-sync', target: 'card-billing', type: 'DB_SHARE', crit: 'MEDIUM' },
        { source: 'bi-svc', target: 'data-lake-svc', type: 'SYNC_API', crit: 'MEDIUM' }
    ],
    depNodes: [
        { id: 'card-apply-svc', name: '信用卡申请', domain: 'retail' },
        { id: 'card-apply-web', name: '信用卡前端', domain: 'retail' },
        { id: 'card-risk', name: '信用卡风控', domain: 'retail' },
        { id: 'card-auth', name: '信用卡授权', domain: 'retail' },
        { id: 'card-billing', name: '信用卡账务', domain: 'retail' },
        { id: 'card-notify', name: '信用卡通知', domain: 'retail' },
        { id: 'card-report', name: '信用卡报表', domain: 'retail' },
        { id: 'loan-svc', name: '贷款服务', domain: 'retail' },
        { id: 'deposit-svc', name: '存款服务', domain: 'retail' },
        { id: 'channel-app', name: '渠道接入', domain: 'retail' },
        { id: 'crm-svc', name: 'CRM服务', domain: 'retail' },
        { id: 'core-bank-svc', name: '核心银行', domain: 'corp' },
        { id: 'payment-svc', name: '支付清算', domain: 'corp' },
        { id: 'risk-engine-svc', name: '风控引擎', domain: 'risk' },
        { id: 'gateway-svc', name: 'API网关', domain: 'platform' },
        { id: 'monitor-svc', name: '监控服务', domain: 'platform' },
        { id: 'data-sync', name: '数据同步', domain: 'data' },
        { id: 'data-lake-svc', name: '数据湖', domain: 'data' },
        { id: 'bi-svc', name: 'BI报表', domain: 'data' }
    ],
    dataCenters: [
        { id: 'dc1', name: '新数据中心', apps: 145, vms: 620, containers: 1200, servers: 180, usage: 72 },
        { id: 'dc2', name: '扩展数据中心', apps: 120, vms: 480, containers: 800, servers: 140, usage: 65 },
        { id: 'dc3', name: '灾备数据中心', apps: 98, vms: 320, containers: 600, servers: 100, usage: 45 },
        { id: 'dc4', name: '同城备份中心', apps: 35, vms: 80, containers: 0, servers: 30, usage: 38 }
    ],
    dbClusters: [
        { id: 'db1', name: '核心银行主库', type: 'Oracle', mode: 'RAC', instances: 4, apps: 3, dr: 'ok', dc: '新数据中心' },
        { id: 'db2', name: '信用卡主库', type: 'MySQL', mode: '主从', instances: 6, apps: 5, dr: 'ok', dc: '新数据中心' },
        { id: 'db3', name: '风控数据库', type: 'MySQL', mode: '主从', instances: 4, apps: 3, dr: 'ok', dc: '新数据中心' },
        { id: 'db4', name: '渠道数据库', type: 'MySQL', mode: '主从', instances: 3, apps: 4, dr: 'warn', dc: '扩展数据中心' },
        { id: 'db5', name: '数据湖OLAP', type: 'ClickHouse', mode: '集群', instances: 8, apps: 6, dr: 'none', dc: '新数据中心' },
        { id: 'db6', name: '缓存集群', type: 'Redis', mode: 'Cluster', instances: 12, apps: 15, dr: 'ok', dc: '新数据中心' },
        { id: 'db7', name: 'OA数据库', type: 'PostgreSQL', mode: '主从', instances: 2, apps: 2, dr: 'none', dc: '扩展数据中心' }
    ],
    mwClusters: {
        MQ: [
            { id: 'mq1', name: '核心消息集群', product: 'RocketMQ', instances: 6, producers: 12, consumers: 18, health: 'healthy' },
            { id: 'mq2', name: '通知消息集群', product: 'RabbitMQ', instances: 4, producers: 8, consumers: 10, health: 'healthy' },
            { id: 'mq3', name: '数据同步集群', product: 'Kafka', instances: 8, producers: 6, consumers: 15, health: 'healthy' }
        ],
        CACHE: [
            { id: 'c1', name: '会话缓存集群', product: 'Redis', instances: 6, producers: 0, consumers: 20, health: 'healthy' },
            { id: 'c2', name: '数据缓存集群', product: 'Redis', instances: 12, producers: 0, consumers: 25, health: 'warn' }
        ],
        SEARCH: [
            { id: 's1', name: '全文检索集群', product: 'Elasticsearch', instances: 6, producers: 5, consumers: 8, health: 'healthy' }
        ]
    },
    techStandards: [
        { name: 'Java 17', category: '语言', lifecycle: 'RECOMMENDED', users: 85 },
        { name: 'Spring Boot 3.x', category: '框架', lifecycle: 'RECOMMENDED', users: 72 },
        { name: 'Vue 3', category: '前端', lifecycle: 'RECOMMENDED', users: 45 },
        { name: 'React 18', category: '前端', lifecycle: 'ALLOWED', users: 20 },
        { name: 'MySQL 8.0', category: '数据库', lifecycle: 'RECOMMENDED', users: 38 },
        { name: 'Redis 7.x', category: '缓存', lifecycle: 'RECOMMENDED', users: 52 },
        { name: 'RocketMQ 5.x', category: '消息', lifecycle: 'RECOMMENDED', users: 30 },
        { name: 'Java 8', category: '语言', lifecycle: 'DEPRECATED', users: 25 },
        { name: 'Spring MVC 4.x', category: '框架', lifecycle: 'DEPRECATED', users: 15 },
        { name: 'jQuery', category: '前端', lifecycle: 'DEPRECATED', users: 12 },
        { name: 'MySQL 5.6', category: '数据库', lifecycle: 'FORBIDDEN', users: 3 },
        { name: 'Struts 2', category: '框架', lifecycle: 'FORBIDDEN', users: 2 },
        { name: 'Dubbo 2.5', category: 'RPC', lifecycle: 'DEPRECATED', users: 8 }
    ],
    driftData: {
        shadow: [
            { name: 'unknown-svc-01', firstSeen: '2026-01-15', calls: 245 },
            { name: 'test-payment-mock', firstSeen: '2026-02-01', calls: 12 },
            { name: 'data-export-job', firstSeen: '2026-01-28', calls: 89 }
        ],
        zombie: [
            { name: 'old-report-svc', registeredDate: '2024-06-01', lastSeen: '2025-11-20' },
            { name: 'batch-converter-v1', registeredDate: '2024-03-15', lastSeen: '2025-08-10' }
        ],
        shadowDep: [
            { from: 'card-apply-svc', to: 'crm-svc', calls: 1520, since: '2026-01-10' },
            { from: 'loan-svc', to: 'monitor-svc', calls: 380, since: '2026-01-20' }
        ],
        zombieDep: [
            { from: 'card-billing', to: 'old-report-svc', declared: '2024-06-01', lastCall: '2025-11-20' },
        ]
    },
    reviews: [
        { id: 'REV-2026-001', title: '智能风控平台立项', type: 'NEW_BUILD', system: '风控引擎', level: 'CORE', applicant: '赵刚', date: '2026-02-10', status: 'REVIEWING' },
        { id: 'REV-2026-002', title: '对公支付通道升级', type: 'CHANGE', system: '支付清算', level: 'CORE', applicant: '周伟', date: '2026-02-08', status: 'APPROVED' },
        { id: 'REV-2026-003', title: '手机银行5.0重构', type: 'NEW_BUILD', system: '渠道系统', level: 'IMPORTANT', applicant: '陈思', date: '2026-02-11', status: 'REVIEWING' },
        { id: 'REV-2026-004', title: 'AI智能客服上线', type: 'NEW_BUILD', system: 'CRM系统', level: 'GENERAL', applicant: '李明', date: '2026-02-12', status: 'DRAFT' },
        { id: 'REV-2026-005', title: '贷款利率引擎优化', type: 'CHANGE', system: '贷款系统', level: 'CORE', applicant: '王芳', date: '2026-02-05', status: 'APPROVED' },
        { id: 'REV-2026-006', title: '核心银行容器化改造', type: 'CHANGE', system: '核心银行', level: 'CORE', applicant: '刘强', date: '2026-01-28', status: 'REJECTED' }
    ]
};
const DOMAIN_COLORS = {};
MOCK.domains.forEach(d => DOMAIN_COLORS[d.id] = d.color);

// Person directory
const PERSONS = {
    '李明': { name: '李明', title: '高级架构师', dept: '信用卡事业部', phone: '138****1001', email: 'liming@bank.com', role: '系统架构师', joinDate: '2016-03-01', skills: ['Java', '微服务', '分布式'], systems: ['信用卡系统'], photo: '👤' },
    '王芳': { name: '王芳', title: '资深架构师', dept: '贷款事业部', phone: '138****1002', email: 'wangfang@bank.com', role: '系统架构师', joinDate: '2017-06-15', skills: ['Java', 'Spring Boot', 'MySQL'], systems: ['贷款系统', '信用卡账务子系统'], photo: '👤' },
    '张伟': { name: '张伟', title: '架构师', dept: '零售运营部', phone: '138****1003', email: 'zhangwei@bank.com', role: '系统架构师', joinDate: '2015-09-01', skills: ['Java', 'Oracle', '容器化'], systems: ['存款系统'], photo: '👤' },
    '陈思': { name: '陈思', title: '高级架构师', dept: '数字渠道部', phone: '138****1004', email: 'chensi@bank.com', role: '系统架构师', joinDate: '2017-01-10', skills: ['Vue', 'React', 'Java', 'H5'], systems: ['渠道系统'], photo: '👤' },
    '刘洋': { name: '刘洋', title: '架构师', dept: '零售营销部', phone: '138****1005', email: 'liuyang@bank.com', role: '系统架构师', joinDate: '2019-04-01', skills: ['Java', 'Elasticsearch', 'React'], systems: ['CRM系统'], photo: '👤' },
    '杨华': { name: '杨华', title: '技术经理', dept: '财富管理部', phone: '138****1006', email: 'yanghua@bank.com', role: '系统架构师', joinDate: '2020-08-01', skills: ['Python', 'Vue', 'AI/ML'], systems: ['财富管理'], photo: '👤' },
    '赵刚': { name: '赵刚', title: '资深架构师', dept: '风险管理部', phone: '138****1007', email: 'zhaogang@bank.com', role: '风控架构师', joinDate: '2016-11-01', skills: ['Java', 'Flink', 'ML', 'Python'], systems: ['风控引擎', '反欺诈系统'], photo: '👤' },
    '刘强': { name: '刘强', title: '首席架构师', dept: '运营管理部', phone: '138****1008', email: 'liuqiang@bank.com', role: '核心系统架构师', joinDate: '2012-03-01', skills: ['Java', 'Oracle', '核心银行'], systems: ['核心银行系统'], photo: '👤' },
    '周伟': { name: '周伟', title: '高级架构师', dept: '结算部', phone: '138****1009', email: 'zhouwei@bank.com', role: '支付架构师', joinDate: '2015-07-01', skills: ['Java', 'Spring Boot', '支付协议'], systems: ['支付清算系统', '合规管理'], photo: '👤' },
    '孙磊': { name: '孙磊', title: '平台架构师', dept: '架构部', phone: '138****1010', email: 'sunlei@bank.com', role: '平台架构师', joinDate: '2014-01-01', skills: ['Go', 'K8S', '微服务治理'], systems: ['API网关', 'DevOps', '监控平台', '统一认证'], photo: '👤' },
    '钱峰': { name: '钱峰', title: '数据架构师', dept: 'CDO办公室', phone: '138****1011', email: 'qianfeng@bank.com', role: '数据架构师', joinDate: '2018-05-01', skills: ['Spark', 'Flink', 'Python', '数据治理'], systems: ['数据湖', 'BI报表', '数据治理', 'AI平台'], photo: '👤' },
    '李建国': { name: '李建国', title: '总架构师', dept: '零售事业群', phone: '138****1012', email: 'lijianguo@bank.com', role: '域架构师', joinDate: '2010-06-01', skills: ['企业架构', '业务建模'], systems: [], photo: '👤' },
    '赵明': { name: '赵明', title: '总架构师', dept: '对公事业群', phone: '138****1013', email: 'zhaoming@bank.com', role: '域架构师', joinDate: '2011-03-01', skills: ['企业架构', '对公业务'], systems: [], photo: '👤' },
    '张副行长': { name: '张副行长', title: '副行长', dept: '行领导', phone: '—', email: '—', role: '零售条线分管领导', joinDate: '2008-01-01', skills: [], systems: [], photo: '👤' },
    '王副行长': { name: '王副行长', title: '副行长', dept: '行领导', phone: '—', email: '—', role: '对公条线分管领导', joinDate: '2009-03-01', skills: [], systems: [], photo: '👤' },
    '吴强': { name: '吴强', title: '高级架构师', dept: '金融市场部', phone: '138****1014', email: 'wuqiang@bank.com', role: '交易系统架构师', joinDate: '2016-02-01', skills: ['Java', 'C++', 'Low-latency'], systems: ['交易系统', '市场风险'], photo: '👤' },
    '李华': { name: '李华', title: '架构师', dept: '贸金部', phone: '138****1015', email: 'lihua@bank.com', role: '贸金架构师', joinDate: '2018-09-01', skills: ['Java', 'Spring Boot'], systems: ['贸易融资', '结算系统'], photo: '👤' },
    '赵阳': { name: '赵阳', title: '架构师', dept: '交易银行部', phone: '138****1016', email: 'zhaoyang@bank.com', role: '现金管理架构师', joinDate: '2019-11-01', skills: ['Java', '银企直连'], systems: ['现金管理'], photo: '👤' },
    '张丽': { name: '张丽', title: '架构师', dept: '合规部', phone: '138****1017', email: 'zhangli@bank.com', role: '合规系统架构师', joinDate: '2019-05-01', skills: ['Java', '合规报送'], systems: ['合规管理'], photo: '👤' },
    '郑伟': { name: '郑伟', title: '技术经理', dept: '综合管理部', phone: '138****1018', email: 'zhengwei@bank.com', role: '管理系统架构师', joinDate: '2017-08-01', skills: ['Java', 'OA系统'], systems: ['OA系统', '人力资源'], photo: '👤' }
};

// Team directory
const TEAMS = {
    '信用卡开发组': { name: '信用卡开发组', leader: '李明', dept: '信用卡事业部', size: 25, members: ['李明', '王芳', '赵刚'], skills: ['Java', 'Spring Boot', 'MySQL', 'Flink'], systems: ['信用卡系统'] },
    '信贷开发组': { name: '信贷开发组', leader: '王芳', dept: '贷款事业部', size: 18, members: ['王芳'], skills: ['Java', 'Spring Boot', 'MySQL'], systems: ['贷款系统'] },
    '存款开发组': { name: '存款开发组', leader: '张伟', dept: '零售运营部', size: 12, members: ['张伟'], skills: ['Java', 'Oracle'], systems: ['存款系统'] },
    '渠道开发组': { name: '渠道开发组', leader: '陈思', dept: '数字渠道部', size: 30, members: ['陈思'], skills: ['Vue', 'React', 'Java', 'H5'], systems: ['渠道系统'] },
    'CRM开发组': { name: 'CRM开发组', leader: '刘洋', dept: '零售营销部', size: 15, members: ['刘洋'], skills: ['Java', 'Elasticsearch', 'React'], systems: ['CRM系统'] },
    '财富管理组': { name: '财富管理组', leader: '杨华', dept: '财富管理部', size: 10, members: ['杨华'], skills: ['Python', 'Vue', 'AI/ML'], systems: ['财富管理'] },
    '核心开发组': { name: '核心开发组', leader: '刘强', dept: '运营管理部', size: 40, members: ['刘强'], skills: ['Java', 'Oracle', '核心银行'], systems: ['核心银行系统'] },
    '支付开发组': { name: '支付开发组', leader: '周伟', dept: '结算部', size: 20, members: ['周伟'], skills: ['Java', 'Spring Boot', '支付协议'], systems: ['支付清算系统'] },
    '风控开发组': { name: '风控开发组', leader: '赵刚', dept: '风险管理部', size: 22, members: ['赵刚'], skills: ['Java', 'Flink', 'Python', 'ML'], systems: ['风控引擎'] },
    '平台开发组': { name: '平台开发组', leader: '孙磊', dept: '架构部', size: 15, members: ['孙磊'], skills: ['Go', 'K8S', 'Java'], systems: ['API网关', 'DevOps', '统一认证'] },
    '数据开发组': { name: '数据开发组', leader: '钱峰', dept: 'CDO办公室', size: 20, members: ['钱峰'], skills: ['Spark', 'Flink', 'ClickHouse'], systems: ['数据湖', 'BI报表'] },
    '金市开发组': { name: '金市开发组', leader: '吴强', dept: '金融市场部', size: 25, members: ['吴强', '李华'], skills: ['Java', 'C++', 'Python'], systems: ['交易系统', '市场风险', '结算系统'] },
    'Team A': { name: 'Team A (信用卡申请)', leader: '李明', dept: '信用卡事业部', size: 8, members: ['李明'], skills: ['Java', 'Spring Boot', 'MySQL'], systems: ['信用卡申请子系统'] },
    'Team B': { name: 'Team B (信用卡账务)', leader: '王芳', dept: '信用卡事业部', size: 10, members: ['王芳'], skills: ['Java', 'Oracle'], systems: ['信用卡账务子系统'] },
    'Team C': { name: 'Team C (信用卡风控)', leader: '赵刚', dept: '信用卡事业部', size: 7, members: ['赵刚'], skills: ['Java', 'Flink', 'Redis'], systems: ['信用卡风控子系统'] }
};

// Architecture Standards
const ARCH_STANDARDS = [
    {
        id: 'STD-HA', name: '高可用架构规范', code: 'STD-HA-V3.2', category: '基础架构',
        version: 'V3.2', status: 'EFFECTIVE', publishDate: '2025-06-01', effectiveDate: '2025-07-01',
        owner: '孙磊', approver: 'CTO办公室',
        description: '规范全行核心及重要系统的高可用架构设计要求，确保业务连续性，覆盖双活数据中心、故障切换、容灾恢复等关键能力。',
        icon: '🏗️',
        chapters: [
            { title: '第一章 总则', content: '本规范适用于全行A类和B类系统。高可用架构设计应遵循"双活优先、同城双活、异地灾备"原则，确保核心业务RPO≤0、RTO≤30秒。' },
            { title: '第二章 双活数据中心', content: '核心系统必须部署于两个独立数据中心（新DC+灾备DC），采用Active-Active模式。数据同步延迟不超过50ms，自动故障切换时间不超过30秒。' },
            { title: '第三章 应用层高可用', content: '应用部署不少于2个实例，核心系统不少于4个实例。必须具备健康检查、自动重启、滚动更新能力。容器化部署优先采用K8S。' },
            { title: '第四章 数据层高可用', content: '核心数据库必须配置主从同步或多副本机制。数据备份策略应满足：全量备份每日一次、增量备份每小时一次、WAL日志实时归档。' },
            { title: '第五章 监控与告警', content: '必须接入统一监控平台，配置关键指标告警。核心系统告警响应时间不超过5分钟，重要系统不超过15分钟。' },
            { title: '第六章 演练与验证', content: '核心系统每季度进行一次灾备切换演练，每年至少一次全链路压测。演练结果须形成报告备案。' }
        ],
        rules: [
            { id: 'R001', name: '核心系统必须双DC部署', level: 'CRITICAL', checkMethod: '巡检', description: '检查A类系统是否部署在两个独立数据中心，确保单DC故障时业务不中断。', checkScript: '检查部署拓扑配置，验证deployMode和dataCenters字段。' },
            { id: 'R003', name: '核心数据库必须有灾备', level: 'CRITICAL', checkMethod: '巡检', description: '验证核心系统的数据库是否配置了跨DC的同步复制或异步复制方案。', checkScript: '检查数据库配置中是否存在灾备节点。' },
            { id: 'R009', name: '应用实例数不少于2', level: 'MAJOR', checkMethod: '巡检', description: '所有生产环境应用必须部署至少2个实例，核心应用不少于4个实例。', checkScript: '查询K8S副本数或部署清单。' },
            { id: 'R010', name: '必须配置健康检查', level: 'MAJOR', checkMethod: '测试', description: '应用必须配置liveness和readiness探针，确保故障自动恢复。', checkScript: '检查K8S探针配置或健康检查端点。' }
        ]
    },
    {
        id: 'STD-DDB', name: '分布式数据库规范', code: 'STD-DDB-V2.1', category: '数据架构',
        version: 'V2.1', status: 'EFFECTIVE', publishDate: '2025-08-15', effectiveDate: '2025-09-01',
        owner: '钱峰', approver: 'CDO办公室',
        description: '规范分布式数据库的选型、架构设计、数据分片策略、事务一致性、运维管理等，确保数据库架构满足高并发、高可用、高扩展的要求。',
        icon: '🗄️',
        chapters: [
            { title: '第一章 总则', content: '本规范适用于全行使用分布式数据库的系统。选型须在技术标准栈范围内，优先选用MySQL 8.0集群版或TiDB。' },
            { title: '第二章 数据库选型', content: '交易类系统推荐MySQL 8.0 + ProxySQL，分析类系统推荐ClickHouse或TiDB。禁止在新项目中使用Oracle（信创要求）。' },
            { title: '第三章 分片与分区', content: '单表数据量超过5000万行须进行分片设计。分片键应选择高基数、查询频繁的字段，避免热点问题。' },
            { title: '第四章 一致性保障', content: '跨分片事务采用TCC或SAGA模式。核心交易场景必须保证强一致性，报表类场景允许最终一致性。' },
            { title: '第五章 数据库共享治理', content: '禁止多个系统共享同一数据库实例。历史遗留共享数据库须制定拆分计划，优先级为：核心>重要>一般。' }
        ],
        rules: [
            { id: 'R002', name: '禁止数据库共享', level: 'CRITICAL', checkMethod: '评审', description: '每个系统必须使用独立的数据库实例，禁止跨系统共享数据库。', checkScript: '评审部署架构图，检查数据库连接配置。' },
            { id: 'R011', name: '大表必须有分片方案', level: 'MAJOR', checkMethod: '评审', description: '预估数据量超过5000万行的表，必须在架构评审时提供分片策略。', checkScript: '评审数据模型设计文档。' },
            { id: 'R012', name: '禁止新项目使用Oracle', level: 'CRITICAL', checkMethod: '评审', description: '新建项目和新增模块禁止选用Oracle数据库，须选用信创目录中的数据库产品。', checkScript: '检查技术选型文档中的数据库选项。' }
        ]
    },
    {
        id: 'STD-XC', name: '信创适配规范', code: 'STD-XC-V1.5', category: '信创转型',
        version: 'V1.5', status: 'EFFECTIVE', publishDate: '2025-10-01', effectiveDate: '2025-11-01',
        owner: '孙磊', approver: 'CTO办公室',
        description: '规范全行信息技术应用创新的适配要求，涵盖操作系统、数据库、中间件、CPU架构等国产化替代方案和迁移路径。',
        icon: '🇨🇳',
        chapters: [
            { title: '第一章 总则', content: '根据监管要求，全行核心系统须在2027年底前完成信创适配。本规范明确信创产品目录、适配标准和迁移优先级。' },
            { title: '第二章 信创产品目录', content: '操作系统：麒麟V10 / 统信UOS；数据库：达梦DM8 / OceanBase / TiDB；中间件：东方通TongWeb / 宝兰德；CPU：鲲鹏920 / 飞腾S2500。' },
            { title: '第三章 适配优先级', content: '一期：办公OA、人力资源、邮件系统（2025Q4完成）；二期：渠道系统、CRM（2026Q2完成）；三期：核心银行、支付清算（2027Q4完成）。' },
            { title: '第四章 兼容性要求', content: '应用须通过信创环境兼容性测试套件。JDK统一使用毕昇JDK或华为JDK。容器运行时兼容iSulad和containerd。' },
            { title: '第五章 迁移方案', content: '迁移采用灰度切换策略，先迁移非核心模块，验证稳定后再迁移核心模块。迁移窗口必须安排在业务低峰期。' }
        ],
        rules: [
            { id: 'R012', name: '禁止新项目使用Oracle', level: 'CRITICAL', checkMethod: '评审', description: '新建项目和新增模块禁止选用Oracle，须选用信创目录中的数据库产品。', checkScript: '检查技术选型文档中的数据库选项。' },
            { id: 'R013', name: '新项目须通过信创兼容性测试', level: 'MAJOR', checkMethod: '测试', description: '新立项系统须在信创环境（鲲鹏+麒麟）完成功能验证和性能测试。', checkScript: '检查测试报告中是否包含信创平台测试结果。' },
            { id: 'R014', name: 'JDK须使用信创版本', level: 'MAJOR', checkMethod: '巡检', description: '生产环境JDK须使用毕昇JDK 17或华为JDK 17，禁止使用Oracle JDK。', checkScript: '检查运行时JDK版本信息。' }
        ]
    },
    {
        id: 'STD-SEC', name: '应用安全规范', code: 'STD-SEC-V4.0', category: '信息安全',
        version: 'V4.0', status: 'EFFECTIVE', publishDate: '2025-04-01', effectiveDate: '2025-05-01',
        owner: '周伟', approver: '信息安全委员会',
        description: '规范全行应用系统的安全架构设计，覆盖身份认证、授权控制、数据加密、API安全、安全审计等领域。',
        icon: '🔒',
        chapters: [
            { title: '第一章 总则', content: '本规范适用于全行所有应用系统。安全设计遵循"最小权限、纵深防御、默认安全"原则。' },
            { title: '第二章 身份认证', content: '对外系统统一接入IAM平台，支持MFA多因素认证。内部系统采用SSO单点登录。服务间调用使用mTLS或JWT。' },
            { title: '第三章 API安全', content: 'API必须规划认证方案（OAuth2.0/API Key/JWT）。敏感接口须实施限流、防重放、防篡改。API不得直接暴露数据库字段。' },
            { title: '第四章 数据加密', content: '敏感数据（身份证号、银行卡号、手机号等）存储须加密，传输须TLS 1.2+。密钥由统一密钥管理平台管理。' },
            { title: '第五章 安全审计', content: '关键操作须记录审计日志，包括操作人、操作时间、操作内容、操作结果。审计日志保留不少于3年。' }
        ],
        rules: [
            { id: 'R006', name: 'API必须规划认证方案', level: 'MAJOR', checkMethod: '评审', description: '所有对外和服务间API必须规划认证方案（OAuth2.0/API Key/JWT等），禁止无认证暴露。', checkScript: '评审API设计文档，检查认证方案说明。' },
            { id: 'R015', name: '敏感数据必须加密存储', level: 'CRITICAL', checkMethod: '巡检', description: '身份证号、银行卡号、手机号等敏感字段必须加密存储或脱敏处理。', checkScript: '扫描数据库表结构和数据样本。' }
        ]
    },
    {
        id: 'STD-SVC', name: '微服务架构规范', code: 'STD-SVC-V2.8', category: '应用架构',
        version: 'V2.8', status: 'EFFECTIVE', publishDate: '2025-09-01', effectiveDate: '2025-10-01',
        owner: '孙磊', approver: 'CTO办公室',
        description: '规范微服务架构的设计原则、服务拆分策略、通信协议、注册发现、配置管理、可观测性等，确保微服务体系的规范和可治理性。',
        icon: '🔧',
        chapters: [
            { title: '第一章 总则', content: '新建系统原则上采用微服务架构。服务拆分粒度应基于业务能力（DDD限界上下文），避免过度拆分。' },
            { title: '第二章 服务注册与发现', content: '所有微服务必须注册到Nacos注册中心。服务名遵循{domain}-{system}-{module}-svc命名规范。健康检查间隔不超过10秒。' },
            { title: '第三章 通信协议', content: '同步调用推荐gRPC（性能优先）或REST（兼容性优先）。异步通信统一使用RocketMQ。禁止服务间直接数据库访问。' },
            { title: '第四章 配置管理', content: '应用配置统一托管至Nacos配置中心。敏感配置（密码、密钥）须加密存储。环境差异通过Profile隔离。' },
            { title: '第五章 可观测性', content: '必须接入统一可观测平台，包括：链路追踪（OTel）、指标采集（Prometheus）、日志聚合（ELK）。核心业务链路须配置全链路追踪。' },
            { title: '第六章 治理策略', content: '须配置服务熔断（Sentinel）、限流、降级策略。核心链路超时设置不超过3秒。服务间调用深度不超过5层。' }
        ],
        rules: [
            { id: 'R004', name: '技术选型在标准栈范围内', level: 'MAJOR', checkMethod: '评审', description: '技术组件选型必须在架构委员会发布的标准技术栈范围内，超出范围须申请豁免。', checkScript: '对照标准技术栈目录，检查项目技术选型清单。' },
            { id: 'R005', name: '微服务必须接入注册中心', level: 'MAJOR', checkMethod: '巡检', description: '所有微服务必须注册到Nacos注册中心，非注册服务不得上线。', checkScript: '查询Nacos注册列表，比对部署清单。' },
            { id: 'R007', name: '必须指定负责人', level: 'MINOR', checkMethod: '评审', description: '每个应用/服务必须在CMDB中指定明确的技术负责人和业务负责人。', checkScript: '检查CMDB应用元数据中owner字段。' },
            { id: 'R008', name: '必须规划OTel接入', level: 'MAJOR', checkMethod: '测试', description: '新建和改造的微服务必须接入OpenTelemetry链路追踪，实现全链路可观测。', checkScript: '检查OTel Agent配置和Trace数据上报。' }
        ]
    }
];

// Build rule → standard lookup
const RULE_STD_MAP = {};
ARCH_STANDARDS.forEach(std => {
    std.rules.forEach(r => { RULE_STD_MAP[r.id] = { stdId: std.id, stdName: std.name, rule: r }; });
});
