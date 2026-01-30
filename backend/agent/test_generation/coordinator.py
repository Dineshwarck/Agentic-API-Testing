"""
Coordinator Agent for Multi-Agent Test Generation

This agent analyzes documentation and client requirements to determine
which specialized test agents should be activated.
"""

import re
from typing import Dict, List, Any


class AgentConfig:
    """Configuration for which agents to activate"""
    def __init__(self):
        self.needs_functional = True  # Always generate functional tests
        self.needs_validation = False
        self.needs_security = False
        self.needs_ux_errors = False


class CoordinatorAgent:
    """
    Coordinates multiple specialized test generation agents.
    Analyzes requirements and activates appropriate agents.
    """
    
    def analyze_requirements(
        self,
        endpoints: List[Dict],
        client_requirements: str = ""
    ) -> AgentConfig:
        """
        Analyze requirements and determine which agents to activate.
        
        Args:
            endpoints: List of endpoint definitions
            client_requirements: Client's additional requirements
            
        Returns:
            AgentConfig with flags for which agents to use
        """
        config = AgentConfig()
        
        # Always generate functional tests
        config.needs_functional = True
        
        # Check if any endpoint has required fields
        config.needs_validation = self._has_required_fields(endpoints)
        
        # Check if security testing is requested
        config.needs_security = self._needs_security_tests(client_requirements)
        
        # Check if UX/error message testing is requested
        config.needs_ux_errors = self._needs_ux_tests(client_requirements)
        
        return config
    
    def _has_required_fields(self, endpoints: List[Dict]) -> bool:
        """Check if any endpoint has required fields"""
        # For now, assume validation is needed if we have POST/PUT/PATCH endpoints
        # In future, parse schema to detect required fields
        for endpoint in endpoints:
            method = endpoint.get('method', '').upper()
            if method in ['POST', 'PUT', 'PATCH']:
                return True
        return False
    
    def _needs_security_tests(self, client_requirements: str) -> bool:
        """Check if security testing is requested"""
        if not client_requirements:
            return False
        
        req_lower = client_requirements.lower()
        security_keywords = [
            'security', 'sql injection', 'xss', 'vulnerability',
            'penetration', 'owasp', 'secure', 'attack'
        ]
        
        return any(keyword in req_lower for keyword in security_keywords)
    
    def _needs_ux_tests(self, client_requirements: str) -> bool:
        """Check if UX/error message testing is requested"""
        if not client_requirements:
            return False
        
        req_lower = client_requirements.lower()
        ux_keywords = [
            'user-friendly', 'user friendly', 'error message',
            'proper error', 'clear error', 'helpful error',
            'non-technical', 'understandable'
        ]
        
        return any(keyword in req_lower for keyword in ux_keywords)
    
    def deduplicate_tests(self, all_tests: List[Dict]) -> List[Dict]:
        """
        Remove duplicate test cases based on title and payload.
        
        Args:
            all_tests: Combined list of tests from all agents
            
        Returns:
            Deduplicated list of tests
        """
        seen = set()
        unique_tests = []
        
        for test in all_tests:
            # Create a unique key from title and payload
            import json
            key = f"{test.get('title', '')}_{json.dumps(test.get('payload', {}), sort_keys=True)}"
            
            if key not in seen:
                seen.add(key)
                unique_tests.append(test)
        
        return unique_tests
