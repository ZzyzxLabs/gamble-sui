"use client";

import React from "react";
import PoolList from "./poollist";

const Admin = () => {
  return (
    <div className="w-screen h-screen flex bg-gray-100">
      {/* Left Card - Pool List */}
      <div className="w-1/2 h-full p-6">
        <div className="bg-gray-50 rounded-xl shadow-lg h-full overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold">Pool Management</h1>
            <p className="text-blue-100 mt-1">Manage active gambling pools</p>
          </div>
          <div className="p-6 h-full overflow-y-auto">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Active Pools</h2>
            </div>
            <PoolList 
              mode="admin" 
              showControls={true} 
              useMockData={true}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Right Card - Additional Information/Controls */}
      <div className="w-1/2 h-full p-6">
        <div className="bg-gray-50 rounded-xl shadow-lg h-full">
          <div className="bg-green-600 text-white p-6">
            <h1 className="text-2xl font-bold">Admin Controls</h1>
            <p className="text-green-100 mt-1">System overview and controls</p>
          </div>
          <div className="p-6 h-full overflow-y-auto">
            <div className="space-y-6">
              {/* System Stats */}
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">System Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">4</div>
                    <div className="text-sm text-gray-600">Active Pools</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">4,551</div>
                    <div className="text-sm text-gray-600">Total SUI</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button onClick={handleNew} className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">
                    Create New Pool
                  </button>
                  <button className="w-full bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors">
                    Pause All Pools
                  </button>
                  <button className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors">
                    Emergency Stop
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span>Pool #3 created - 2 hours ago</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span>Pool #2 updated - 4 hours ago</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                    <span>Pool #1 balance changed - 6 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
