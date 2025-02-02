import os
import sys
import json
import time
import signal
import asyncio
import traceback
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Global price cache
price_cache = {}

class StockHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')

    def get_mock_data(self, symbol):
        # Generate realistic mock data for Turkish stocks
        import random
        base_prices = {
            'THYAO': 256.40,
            'GARAN': 48.72,
            'ASELS': 84.15,
            'KCHOL': 176.90,
            'SASA': 342.50,
            'EREGL': 52.85,
            'BIMAS': 164.30,
            'AKBNK': 44.92,
        }
        
        base_price = base_prices.get(symbol, 100.0)
        variation = random.uniform(-2, 2)
        price = base_price * (1 + variation / 100)
        
        return {
            'symbol': symbol,
            'price': round(price, 2),
            'change_percentage': round(variation, 2),
            'volume': random.randint(100000, 1000000),
            'timestamp': time.time()
        }

    def do_GET(self):
        try:
            parsed_path = urlparse(self.path)
            
            if parsed_path.path != '/prices':
                self.send_error(404, "Not Found")
                return
            
            params = parse_qs(parsed_path.query)
            symbols = params.get('symbols', [])
            
            if not symbols:
                self.send_error(400, "No symbols provided")
                return
            
            symbols = symbols[0].split(',')
            print(f"Processing request for symbols: {symbols}")
            
            stocks_data = []
            for symbol in symbols:
                data = self.get_mock_data(symbol.upper())
                if data:
                    stocks_data.append(data)
            
            self.send_response(200)
            self.send_cors_headers()
            self.end_headers()
            
            response = {
                'success': True,
                'data': stocks_data
            }
            
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            print(f"Server error: {str(e)}")
            self.send_error(500, str(e))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

def run(server_class=HTTPServer, handler_class=StockHandler, port=8000):
    server_address = ('', port)
    
    try:
        httpd = server_class(server_address, handler_class)
        print(f'Starting stock price server on port {port}...')
        
        # Create a PID file
        pid = os.getpid()
        with open('api/stocks.pid', 'w') as f:
            f.write(str(pid))
        
        httpd.serve_forever()
        
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Server error: {str(e)}")
    finally:
        try:
            os.remove('api/stocks.pid')
        except:
            pass
        print('Server stopped')

if __name__ == '__main__':
    run()