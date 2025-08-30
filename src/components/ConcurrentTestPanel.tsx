import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { ConcurrentTestService, LoadTestResult, ConcurrentTestResult } from '../services/concurrentTestService';
import { AVAILABLE_MODELS } from '../hooks/useModelSelection';

interface ConcurrentTestPanelProps {
  selectedModel: string;
}

const ConcurrentTestPanel: React.FC<ConcurrentTestPanelProps> = ({ selectedModel }) => {
  const [testResults, setTestResults] = useState<LoadTestResult | null>(null);
  const [concurrentResults, setConcurrentResults] = useState<ConcurrentTestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testConfig, setTestConfig] = useState({
    prompt: '请用中文回答：人工智能的发展趋势是什么？',
    maxConcurrency: 3,
    timeout: 30000,
    iterations: 5
  });
  const [selectedModels, setSelectedModels] = useState<string[]>([selectedModel]);
  const [healthStatus, setHealthStatus] = useState<Record<string, boolean>>({});
  const [checkingHealth, setCheckingHealth] = useState(false);

  const testService = ConcurrentTestService.getInstance();

  const handleModelSelection = (event: any) => {
    const value = event.target.value;
    setSelectedModels(typeof value === 'string' ? value.split(',') : value);
  };

  const checkModelHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const health = await testService.checkModelHealth(AVAILABLE_MODELS);
      setHealthStatus(health);
    } catch (error) {
      console.error('健康检查失败:', error);
    } finally {
      setCheckingHealth(false);
    }
  }, [testService]);

  const calculateModelPerformance = useCallback((results: ConcurrentTestResult[]) => {
    const performance: Record<string, any> = {};
    
    selectedModels.forEach(model => {
      const modelResults = results.filter(r => r.model === model);
      const successful = modelResults.filter(r => r.status === 'success');
      
      if (modelResults.length > 0) {
        performance[model] = {
          avgLatency: successful.length > 0 
            ? successful.reduce((sum, r) => sum + r.latency, 0) / successful.length 
            : 0,
          successRate: successful.length / modelResults.length,
          totalRequests: modelResults.length
        };
      }
    });
    
    return performance;
  }, [selectedModels]);

  const runConcurrentTest = useCallback(async () => {
    setIsTesting(true);
    setTestResults(null);
    setConcurrentResults([]);

    try {
      const prompts = Array(testConfig.iterations).fill(testConfig.prompt);
      
      const results = await testService.testModelsConcurrently(
        prompts,
        selectedModels,
        testConfig.maxConcurrency
      );
      
      setConcurrentResults(results);
      
      // 转换为LoadTestResult格式以便显示
      const loadTestResult: LoadTestResult = {
        totalRequests: results.length,
        successfulRequests: results.filter(r => r.status === 'success').length,
        failedRequests: results.filter(r => r.status === 'error').length,
        averageLatency: results.reduce((sum, r) => sum + r.latency, 0) / results.length,
        minLatency: Math.min(...results.map(r => r.latency)),
        maxLatency: Math.max(...results.map(r => r.latency)),
        throughput: results.length / (Math.max(...results.map(r => r.latency)) / 1000),
        results,
        modelPerformance: calculateModelPerformance(results)
      };
      
      setTestResults(loadTestResult);
    } catch (error) {
      console.error('并发测试失败:', error);
    } finally {
      setIsTesting(false);
    }
  }, [testConfig, selectedModels, testService, calculateModelPerformance]);

  const runLoadTest = useCallback(async () => {
    setIsTesting(true);
    setTestResults(null);

    try {
      const config = {
        maxConcurrency: testConfig.maxConcurrency,
        timeout: testConfig.timeout,
        prompts: Array(testConfig.iterations).fill(testConfig.prompt),
        models: selectedModels
      };

      const results = await testService.runLoadTest(config);
      setTestResults(results);
    } catch (error) {
      console.error('负载测试失败:', error);
    } finally {
      setIsTesting(false);
    }
  }, [testConfig, selectedModels, testService]);


  const formatLatency = (ms: number) => `${ms.toFixed(0)}ms`;
  const formatThroughput = (rps: number) => `${rps.toFixed(2)} req/s`;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        OpenRouter 并发测试面板
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        测试OpenRouter API的多模型并发能力和负载均衡特性
      </Alert>

      {/* 配置面板 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            测试配置
          </Typography>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="测试提示词"
                value={testConfig.prompt}
                onChange={(e) => setTestConfig({ ...testConfig, prompt: e.target.value })}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>选择模型</InputLabel>
                <Select
                  multiple
                  value={selectedModels}
                  onChange={handleModelSelection}
                  renderValue={(selected) => selected.join(', ')}
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <MenuItem key={model} value={model}>
                      {model}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="最大并发数"
                value={testConfig.maxConcurrency}
                onChange={(e) => setTestConfig({ ...testConfig, maxConcurrency: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="超时时间 (ms)"
                value={testConfig.timeout}
                onChange={(e) => setTestConfig({ ...testConfig, timeout: parseInt(e.target.value) })}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="迭代次数"
                value={testConfig.iterations}
                onChange={(e) => setTestConfig({ ...testConfig, iterations: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 50 }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={checkModelHealth}
              disabled={checkingHealth}
            >
              {checkingHealth ? <CircularProgress size={24} /> : '检查模型健康'}
            </Button>
            
            <Button
              variant="contained"
              onClick={runConcurrentTest}
              disabled={isTesting}
            >
              {isTesting ? <CircularProgress size={24} /> : '运行并发测试'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={runLoadTest}
              disabled={isTesting}
            >
              {isTesting ? <CircularProgress size={24} /> : '运行负载测试'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 模型健康状态 */}
      {Object.keys(healthStatus).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              模型健康状态
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {AVAILABLE_MODELS.map(model => (
                <Chip
                  key={model}
                  label={model.split('/').pop()}
                  color={healthStatus[model] ? 'success' : 'error'}
                  variant="outlined"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 测试结果 */}
      {testResults && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                测试结果汇总
              </Typography>
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {testResults.totalRequests}
                    </Typography>
                    <Typography variant="body2">总请求数</Typography>
                  </Paper>
                </Grid>
                
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {testResults.successfulRequests}
                    </Typography>
                    <Typography variant="body2">成功请求</Typography>
                  </Paper>
                </Grid>
                
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {testResults.failedRequests}
                    </Typography>
                    <Typography variant="body2">失败请求</Typography>
                  </Paper>
                </Grid>
                
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {formatLatency(testResults.averageLatency)}
                    </Typography>
                    <Typography variant="body2">平均延迟</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  吞吐量: {formatThroughput(testResults.throughput)}
                </Typography>
                <Typography variant="body2">
                  延迟范围: {formatLatency(testResults.minLatency)} - {formatLatency(testResults.maxLatency)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* 模型性能详情 */}
          {Object.keys(testResults.modelPerformance).length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  各模型性能
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>模型</TableCell>
                        <TableCell align="right">平均延迟</TableCell>
                        <TableCell align="right">成功率</TableCell>
                        <TableCell align="right">请求数</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(testResults.modelPerformance).map(([model, stats]) => (
                        <TableRow key={model}>
                          <TableCell>{model.split('/').pop()}</TableCell>
                          <TableCell align="right">{formatLatency(stats.avgLatency)}</TableCell>
                          <TableCell align="right">
                            {(stats.successRate * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">{stats.totalRequests}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* 详细结果 */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>详细测试结果</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>模型</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>延迟</TableCell>
                      <TableCell>Token数</TableCell>
                      <TableCell>响应预览</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {concurrentResults.length > 0 ? concurrentResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.model.split('/').pop()}</TableCell>
                        <TableCell>
                          <Chip
                            label={result.status}
                            color={result.status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatLatency(result.latency)}</TableCell>
                        <TableCell>{result.tokens}</TableCell>
                        <TableCell>
                          {result.response.substring(0, 50)}...
                        </TableCell>
                      </TableRow>
                    )) : testResults.results.slice(0, 10).map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.model.split('/').pop()}</TableCell>
                        <TableCell>
                          <Chip
                            label={result.status}
                            color={result.status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatLatency(result.latency)}</TableCell>
                        <TableCell>{result.tokens}</TableCell>
                        <TableCell>
                          {result.response.substring(0, 50)}...
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </>
      )}
    </Box>
  );
};

export default ConcurrentTestPanel;