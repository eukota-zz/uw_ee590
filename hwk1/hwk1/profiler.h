#pragma once
#include <iostream>
#include <vector>



#include <Windows.h> ///< for performance counters

struct ProfilerStruct
{
	ProfilerStruct() { Frequency.QuadPart = 1; CountStart.QuadPart = 0; CountStop.QuadPart = 0; }
	LARGE_INTEGER Frequency;
	LARGE_INTEGER CountStart;
	LARGE_INTEGER CountStop;
	void Start();
	void Stop();
	void AcquireFrequency();
	float Log(bool writeToLog = false);
};
