from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# 代理 URL
CLOUDSHARK_BASE_URL = 'https://www.cloudshark.org'

@app.route('/captures/ca3302fd7d41/tf/status', methods=['GET'])
def proxy_capture():
    # 目标 URL
    target_url = f'{CLOUDSHARK_BASE_URL}/captures/ca3302fd7d41/tf/status'
    
    # 获取查询参数（如果有）
    params = request.args.to_dict()
    
    # 发送 GET 请求到 CloudShark
    response = requests.get(target_url, params=params)
    print(response.text)
    
    # 获取响应内容
    response_data = response.json() if response.headers.get('Content-Type') == 'application/json' else response.text
    
    # 设置 CORS 头部
    headers = {
        'Access-Control-Allow-Origin': '*',  # 允许所有来源的请求
        'Access-Control-Allow-Methods': 'GET',  # 允许 GET 方法
        'Access-Control-Allow-Headers': 'Content-Type'  # 允许的请求头
    }
    
    # 返回响应
    return (response_data, response.status_code, headers)


@app.route('/captures/ca3302fd7d41/tf/packets', methods=['GET'])
def proxy_packets():
    # 目标 URL
    target_url = f'{CLOUDSHARK_BASE_URL}/captures/ca3302fd7d41/tf/packets?filter=&start=0&count=1000'
    
    # 获取查询参数（如果有）
    params = request.args.to_dict()
    
    # 发送 GET 请求到 CloudShark
    response = requests.get(target_url, params=params)
    print(response.text)
    
    # 获取响应内容
    response_data = response.json() if response.headers.get('Content-Type') == 'application/json' else response.text
    
    # 设置 CORS 头部
    headers = {
        'Access-Control-Allow-Origin': '*',  # 允许所有来源的请求
        'Access-Control-Allow-Methods': 'GET',  # 允许 GET 方法
        'Access-Control-Allow-Headers': 'Content-Type'  # 允许的请求头
    }
    
    # 返回响应
    return (response_data, response.status_code, headers)

@app.route('/captures/ca3302fd7d41/tf/decode', methods=['GET'])
def proxy_decode():
    # 目标 URL
    target_url = f'{CLOUDSHARK_BASE_URL}//captures/ca3302fd7d41/tf/decode?frame=1&prev_frame=0'
    
    # 获取查询参数（如果有）
    params = request.args.to_dict()
    
    # 发送 GET 请求到 CloudShark
    response = requests.get(target_url, params=params)
    print(response.text)
    
    # 获取响应内容
    response_data = response.json() if response.headers.get('Content-Type') == 'application/json' else response.text
    
    # 设置 CORS 头部
    headers = {
        'Access-Control-Allow-Origin': '*',  # 允许所有来源的请求
        'Access-Control-Allow-Methods': 'GET',  # 允许 GET 方法
        'Access-Control-Allow-Headers': 'Content-Type'  # 允许的请求头
    }
    
    # 返回响应
    return (response_data, response.status_code, headers)

@app.route('/captures/ca3302fd7d41/tf/filtercheck', methods=['GET'])
def proxy_filtercheck():
    filter_param = request.args.get('f')
    print(filter_param)
    # 目标 URL
    target_url = f'{CLOUDSHARK_BASE_URL}//captures/ca3302fd7d41/tf/filtercheck?f={filter_param}'
    
    # 获取查询参数（如果有）
    params = request.args.to_dict()
    
    # 发送 GET 请求到 CloudShark
    response = requests.get(target_url, params=params)
    print(response.text)
    
    # 获取响应内容
    response_data = response.json() if response.headers.get('Content-Type') == 'application/json' else response.text
    
    # 设置 CORS 头部
    headers = {
        'Access-Control-Allow-Origin': '*',  # 允许所有来源的请求
        'Access-Control-Allow-Methods': 'GET',  # 允许 GET 方法
        'Access-Control-Allow-Headers': 'Content-Type'  # 允许的请求头
    }
    
    # 返回响应
    return (response_data, response.status_code, headers)

@app.route('/autocomplete/fields', methods=['GET'])
def proxy_fields():
    search_query = request.args.get('q')
    print("-----------")
    print(search_query)
    
    # 正确构建目标 URL
    target_url = f'https://www.cloudshark.org/autocomplete/fields?q={search_query}'
    print(target_url)
    
    # 获取查询参数（如果有）
    params = request.args.to_dict()
    
    # 设置请求头
    headers = {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Connection': 'keep-alive',
        'Cookie': '_session_id=86f4b1259ccebcadcf9f99c750f60be2',
        'Host': 'www.cloudshark.org',
        'Referer': 'https://www.cloudshark.org/captures/ca3302fd7d41',
        'Sec-CH-UA': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
    }
    
    # 发送 GET 请求到 CloudShark，附带自定义头部
    response = requests.get(target_url, params=params, headers=headers)
    
    print(f"Response status code: {response.status_code}")
    print(f"Response content: {response.text}")
    
    # 检查是否返回了 JSON 数据
    if response.status_code == 404:
        return jsonify({"error": "Resource not found"}), 404
    
    # 获取响应内容
    response_data = response.json() if response.headers.get('Content-Type') == 'application/json' else response.text
    
    # 设置 CORS 头部
    cors_headers = {
        'Access-Control-Allow-Origin': '*',  # 允许所有来源的请求
        'Access-Control-Allow-Methods': 'GET',  # 允许 GET 方法
        'Access-Control-Allow-Headers': 'Content-Type'  # 允许的请求头
    }
    
    # 返回响应
    return (response_data, response.status_code, cors_headers)



if __name__ == '__main__':
    # 运行 Flask 应用
    print(1)
    app.run(host='0.0.0.0', port=8000, debug=True)